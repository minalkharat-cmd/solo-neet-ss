import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { battleQuestions } from './battleQuestions.js';
import { sanitizeInput } from '../middleware/validation.js';
import logger from '../lib/logger.js';

// Fisher-Yates shuffle — unbiased
const fisherYatesShuffle = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

const getBattleQuestions = (count = 10) => {
    return fisherYatesShuffle(battleQuestions).slice(0, count);
};

/**
 * Initialize Socket.io PvP system.
 * @param {object} deps.dal — Data Access Layer
 */
export function initPvPSocket(httpServer, { dal, JWT_SECRET, allowedOrigins }) {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    const matchmakingQueue = [];
    const battleRooms = {};
    const playerSockets = {};
    const privateRooms = {};

    // Socket.io JWT authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            return next(new Error('Invalid token'));
        }
    });

    const generateId = () => crypto.randomUUID();

    const createBattleRoom = (player1, player2, isRanked = true) => {
        const roomId = generateId();
        const questions = getBattleQuestions(10);

        battleRooms[roomId] = {
            id: roomId,
            players: [
                { ...player1, score: 0, answered: 0, ready: false },
                { ...player2, score: 0, answered: 0, ready: false }
            ],
            questions,
            currentQuestion: 0,
            status: 'waiting',
            isRanked,
            startTime: null,
            answers: {}
        };

        return battleRooms[roomId];
    };

    const endBattle = (roomId) => {
        const room = battleRooms[roomId];
        if (!room) return;

        room.status = 'finished';
        room.finishedAt = Date.now();

        const [player1, player2] = room.players;
        let winner = null;
        let isDraw = false;

        if (player1.score > player2.score) {
            winner = player1;
        } else if (player2.score > player1.score) {
            winner = player2;
        } else {
            isDraw = true;
        }

        io.to(roomId).emit('battleEnd', {
            winner: winner ? {
                username: winner.username,
                hunterName: winner.hunterName,
                score: winner.score
            } : null,
            isDraw,
            finalScores: {
                player1: { username: player1.username, score: player1.score },
                player2: { username: player2.username, score: player2.score }
            },
            xpReward: winner ? 100 : 50
        });

        logger.info('Battle ended', { player1: player1.username, score1: player1.score, player2: player2.username, score2: player2.score });

        setTimeout(() => {
            delete battleRooms[roomId];
        }, 30000);
    };

    io.on('connection', async (socket) => {
        logger.info('PvP client connected', { socketId: socket.id, userId: socket.userId });

        socket.on('register', async (userData) => {
            const dbUser = await dal.users.findById(socket.userId);
            const progress = await dal.progress.findByUserId(socket.userId);
            playerSockets[socket.id] = {
                id: socket.id,
                odid: socket.userId,
                username: dbUser?.username || sanitizeInput(userData.username, 30) || 'Hunter',
                hunterName: dbUser?.hunterName || sanitizeInput(userData.hunterName, 50) || 'Hunter',
                level: progress?.level || 1,
                avatar: dbUser?.avatar || null
            };
        });

        socket.on('joinQueue', () => {
            const player = playerSockets[socket.id];
            if (!player) {
                socket.emit('error', { message: 'Please register first' });
                return;
            }

            const existingIndex = matchmakingQueue.findIndex(p => p.id === socket.id);
            if (existingIndex !== -1) {
                matchmakingQueue.splice(existingIndex, 1);
            }

            matchmakingQueue.push(player);
            socket.emit('queueJoined', { position: matchmakingQueue.length });

            if (matchmakingQueue.length >= 2) {
                const player1 = matchmakingQueue.shift();
                const player2 = matchmakingQueue.shift();
                const room = createBattleRoom(player1, player2);

                const socket1 = io.sockets.sockets.get(player1.id);
                const socket2 = io.sockets.sockets.get(player2.id);

                if (socket1 && socket2) {
                    socket1.join(room.id);
                    socket2.join(room.id);

                    socket1.emit('matchFound', {
                        roomId: room.id, playerIndex: 0,
                        questions: room.questions.map(q => ({ ...q, correct: undefined }))
                    });
                    socket2.emit('matchFound', {
                        roomId: room.id, playerIndex: 1,
                        questions: room.questions.map(q => ({ ...q, correct: undefined }))
                    });

                    socket1.emit('opponentInfo', { username: player2.username, hunterName: player2.hunterName, level: player2.level, avatar: player2.avatar });
                    socket2.emit('opponentInfo', { username: player1.username, hunterName: player1.hunterName, level: player1.level, avatar: player1.avatar });
                }
            }
        });

        socket.on('leaveQueue', () => {
            const index = matchmakingQueue.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                matchmakingQueue.splice(index, 1);
                socket.emit('queueLeft');
            }
        });

        socket.on('createPrivateRoom', () => {
            const player = playerSockets[socket.id];
            if (!player) {
                socket.emit('error', { message: 'Please register first' });
                return;
            }
            const roomCode = generateRoomCode();
            privateRooms[roomCode] = { code: roomCode, host: player, hostSocket: socket.id, createdAt: Date.now() };
            socket.emit('privateRoomCreated', { roomCode });
        });

        socket.on('joinPrivateRoom', ({ roomCode }) => {
            const player = playerSockets[socket.id];
            if (!player) {
                socket.emit('error', { message: 'Please register first' });
                return;
            }

            const privateRoom = privateRooms[roomCode.toUpperCase()];
            if (!privateRoom) {
                socket.emit('error', { message: 'Room not found or expired' });
                return;
            }

            const room = createBattleRoom(privateRoom.host, player, false);
            const hostSocket = io.sockets.sockets.get(privateRoom.hostSocket);

            if (hostSocket) {
                hostSocket.join(room.id);
                socket.join(room.id);

                hostSocket.emit('matchFound', { roomId: room.id, playerIndex: 0, isPrivate: true, questions: room.questions.map(q => ({ ...q, correct: undefined })) });
                socket.emit('matchFound', { roomId: room.id, playerIndex: 1, isPrivate: true, questions: room.questions.map(q => ({ ...q, correct: undefined })) });

                hostSocket.emit('opponentInfo', { username: player.username, hunterName: player.hunterName, level: player.level, avatar: player.avatar });
                socket.emit('opponentInfo', { username: privateRoom.host.username, hunterName: privateRoom.host.hunterName, level: privateRoom.host.level, avatar: privateRoom.host.avatar });
            }

            delete privateRooms[roomCode];
        });

        socket.on('playerReady', ({ roomId }) => {
            const room = battleRooms[roomId];
            if (!room) return;

            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players[playerIndex].ready = true;
                io.to(roomId).emit('playerReadyUpdate', { player1Ready: room.players[0].ready, player2Ready: room.players[1].ready });

                if (room.players.every(p => p.ready)) {
                    room.status = 'countdown';
                    let countdown = 3;
                    const countdownInterval = setInterval(() => {
                        io.to(roomId).emit('countdown', { count: countdown });
                        countdown--;
                        if (countdown < 0) {
                            clearInterval(countdownInterval);
                            room.status = 'active';
                            room.startTime = Date.now();
                            io.to(roomId).emit('battleStart', { questionIndex: 0, timePerQuestion: 15 });
                        }
                    }, 1000);
                }
            }
        });

        socket.on('submitAnswer', ({ roomId, questionIndex, answer, timeLeft }) => {
            const room = battleRooms[roomId];
            if (!room || room.status !== 'active') return;

            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex === -1) return;

            const question = room.questions[questionIndex];
            if (!question) return;

            const answerKey = `${socket.id}_${questionIndex}`;
            if (room.answers[answerKey]) return;

            const isCorrect = answer === question.correct;
            const points = isCorrect ? (10 + Math.floor(timeLeft / 2)) : 0;

            room.answers[answerKey] = { answer, isCorrect, points };
            room.players[playerIndex].answered++;
            if (isCorrect) room.players[playerIndex].score += points;

            io.to(roomId).emit('answerSubmitted', {
                playerIndex, questionIndex, isCorrect,
                correctAnswer: question.correct,
                scores: room.players.map(p => ({ score: p.score, answered: p.answered }))
            });

            const bothAnswered = room.players.every(p => room.answers[`${p.id}_${questionIndex}`]);
            if (bothAnswered) {
                setTimeout(() => {
                    if (questionIndex < room.questions.length - 1) {
                        io.to(roomId).emit('nextQuestion', { questionIndex: questionIndex + 1, timePerQuestion: 15 });
                    } else {
                        endBattle(roomId);
                    }
                }, 2000);
            }
        });

        socket.on('disconnect', () => {
            const queueIndex = matchmakingQueue.findIndex(p => p.id === socket.id);
            if (queueIndex !== -1) matchmakingQueue.splice(queueIndex, 1);

            Object.keys(privateRooms).forEach(code => {
                if (privateRooms[code].hostSocket === socket.id) delete privateRooms[code];
            });

            Object.keys(battleRooms).forEach(roomId => {
                const room = battleRooms[roomId];
                const playerIndex = room.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1 && room.status !== 'finished') {
                    room.status = 'finished';
                    io.to(roomId).emit('opponentDisconnected', { winner: room.players[1 - playerIndex].username });
                }
            });

            delete playerSockets[socket.id];
        });
    });

    // Periodic cleanup of stale state to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        Object.keys(privateRooms).forEach(code => {
            if (now - privateRooms[code].createdAt > 5 * 60 * 1000) delete privateRooms[code];
        });
        Object.keys(battleRooms).forEach(roomId => {
            const room = battleRooms[roomId];
            if (room.finished && now - (room.finishedAt || room.startedAt) > 10 * 60 * 1000) delete battleRooms[roomId];
        });
        Object.keys(playerSockets).forEach(socketId => {
            if (!io.sockets.sockets.get(socketId)) delete playerSockets[socketId];
        });
    }, 60000);

    return { io, matchmakingQueue, battleRooms };
}
