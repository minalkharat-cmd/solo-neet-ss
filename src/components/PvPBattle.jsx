import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// PvP Battle Component - Full real-time 1v1 battle experience
export function PvPBattle({ user, gameState, onClose, soundEnabled, addXP }) {
    const socketRef = useRef(null);
    const timerRef = useRef(null);

    // Connection state
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    // Lobby state
    const [phase, setPhase] = useState('lobby'); // lobby, queue, waiting, countdown, battle, result
    const [queuePosition, setQueuePosition] = useState(0);
    const [privateRoomCode, setPrivateRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');

    // Battle state
    const [roomId, setRoomId] = useState(null);
    const [playerIndex, setPlayerIndex] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [countdown, setCountdown] = useState(3);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [scores, setScores] = useState([{ score: 0, answered: 0 }, { score: 0, answered: 0 }]);
    const [showExplanation, setShowExplanation] = useState(false);
    const [lastResult, setLastResult] = useState(null); // { isCorrect, correctAnswer }

    // Result state
    const [battleResult, setBattleResult] = useState(null);

    // Initialize socket connection
    useEffect(() => {
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            // Register user data
            socket.emit('register', {
                odid: user?.id || 'anonymous',
                username: user?.username || 'Hunter',
                hunterName: user?.hunterName || 'Hunter',
                level: gameState.level,
                avatar: user?.avatar
            });
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socket.on('connect_error', (err) => {
            setError('Could not connect to server');
            console.error('Socket connection error:', err);
        });

        socket.on('error', ({ message }) => {
            setError(message);
        });

        // Queue events
        socket.on('queueJoined', ({ position }) => {
            setPhase('queue');
            setQueuePosition(position);
        });

        socket.on('queueLeft', () => {
            setPhase('lobby');
            setQueuePosition(0);
        });

        // Private room events
        socket.on('privateRoomCreated', ({ roomCode }) => {
            setPrivateRoomCode(roomCode);
            setPhase('waiting');
        });

        // Match found
        socket.on('matchFound', ({ roomId, playerIndex, questions: qs }) => {
            setRoomId(roomId);
            setPlayerIndex(playerIndex);
            setQuestions(qs);
            setPhase('waiting');
        });

        socket.on('opponentInfo', (info) => {
            setOpponent(info);
        });

        // Ready events
        socket.on('playerReadyUpdate', ({ player1Ready, player2Ready }) => {
            // Could show ready indicators
        });

        socket.on('countdown', ({ count }) => {
            setPhase('countdown');
            setCountdown(count);
        });

        socket.on('battleStart', ({ questionIndex, timePerQuestion }) => {
            setPhase('battle');
            setCurrentQ(questionIndex);
            setTimeLeft(timePerQuestion);
            setSelectedAnswer(null);
            setSubmitted(false);
            setShowExplanation(false);
            setLastResult(null);
        });

        socket.on('answerSubmitted', ({ playerIndex: pi, questionIndex, isCorrect, correctAnswer, scores: newScores }) => {
            setScores(newScores);
            if (pi === playerIndex) {
                setLastResult({ isCorrect, correctAnswer });
                setShowExplanation(true);
            }
        });

        socket.on('nextQuestion', ({ questionIndex, timePerQuestion }) => {
            setCurrentQ(questionIndex);
            setTimeLeft(timePerQuestion);
            setSelectedAnswer(null);
            setSubmitted(false);
            setShowExplanation(false);
            setLastResult(null);
        });

        socket.on('battleEnd', (result) => {
            setBattleResult(result);
            setPhase('result');
            // Award XP
            if (addXP) {
                addXP(result.xpReward);
            }
        });

        socket.on('opponentDisconnected', ({ winner }) => {
            setBattleResult({
                winner: { username: winner },
                isDraw: false,
                finalScores: scores,
                xpReward: 75,
                forfeit: true
            });
            setPhase('result');
        });

        return () => {
            socket.disconnect();
        };
    }, [user, gameState.level]);

    // Timer logic
    useEffect(() => {
        if (phase !== 'battle' || submitted) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Auto-submit on timeout
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase, submitted, currentQ]);

    const handleJoinQueue = () => {
        socketRef.current?.emit('joinQueue');
    };

    const handleLeaveQueue = () => {
        socketRef.current?.emit('leaveQueue');
        setPhase('lobby');
    };

    const handleCreatePrivate = () => {
        socketRef.current?.emit('createPrivateRoom');
    };

    const handleJoinPrivate = () => {
        if (joinCode.length >= 4) {
            socketRef.current?.emit('joinPrivateRoom', { roomCode: joinCode.toUpperCase() });
        }
    };

    const handleReady = () => {
        socketRef.current?.emit('playerReady', { roomId });
    };

    const handleSelectAnswer = (index) => {
        if (!submitted) {
            setSelectedAnswer(index);
        }
    };

    const handleSubmit = (isTimeout = false) => {
        if (submitted) return;
        setSubmitted(true);
        if (timerRef.current) clearInterval(timerRef.current);

        socketRef.current?.emit('submitAnswer', {
            roomId,
            questionIndex: currentQ,
            answer: isTimeout ? -1 : selectedAnswer,
            timeLeft
        });
    };

    const handlePlayAgain = () => {
        setPhase('lobby');
        setBattleResult(null);
        setQuestions([]);
        setScores([{ score: 0, answered: 0 }, { score: 0, answered: 0 }]);
        setPrivateRoomCode('');
        setJoinCode('');
    };

    // Render lobby
    if (phase === 'lobby') {
        return (
            <div className="pvp-overlay">
                <div className="pvp-container system-window">
                    <button className="modal-close" onClick={onClose}>×</button>
                    <h2 className="pvp-title">⚔️ Monarch Battles</h2>
                    <p className="pvp-subtitle">Challenge other hunters in real-time</p>

                    {error && <div className="pvp-error">{error}</div>}
                    {!connected && <div className="pvp-connecting">Connecting to server...</div>}

                    {connected && (
                        <div className="pvp-lobby-options">
                            <button className="btn btn-primary btn-lg" onClick={handleJoinQueue}>
                                🔍 Find Match
                            </button>

                            <div className="pvp-divider"><span>or</span></div>

                            <button className="btn btn-secondary" onClick={handleCreatePrivate}>
                                🏠 Create Private Room
                            </button>

                            <div className="pvp-join-section">
                                <input
                                    type="text"
                                    placeholder="Enter room code"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    className="pvp-code-input"
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleJoinPrivate}
                                    disabled={joinCode.length < 4}
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    // Render queue
    if (phase === 'queue') {
        return (
            <div className="pvp-overlay">
                <div className="pvp-container system-window">
                    <h2 className="pvp-title">🔍 Searching...</h2>
                    <div className="pvp-queue-spinner"></div>
                    <p>Looking for opponent...</p>
                    <p className="pvp-queue-pos">Queue position: {queuePosition}</p>
                    <button className="btn btn-secondary" onClick={handleLeaveQueue}>
                        Cancel
                    </button>
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    // Render waiting for opponent (private room)
    if (phase === 'waiting' && privateRoomCode && !opponent) {
        return (
            <div className="pvp-overlay">
                <div className="pvp-container system-window">
                    <h2 className="pvp-title">🏠 Private Room</h2>
                    <p>Share this code with your friend:</p>
                    <div className="pvp-room-code">{privateRoomCode}</div>
                    <p className="pvp-waiting">Waiting for opponent to join...</p>
                    <button className="btn btn-secondary" onClick={() => setPhase('lobby')}>
                        Cancel
                    </button>
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    // Render opponent found / ready check
    if (phase === 'waiting' && opponent) {
        return (
            <div className="pvp-overlay">
                <div className="pvp-container system-window">
                    <h2 className="pvp-title">⚔️ Opponent Found!</h2>
                    <div className="pvp-matchup">
                        <div className="pvp-player">
                            <div className="pvp-avatar">{user?.avatar ? <img src={user.avatar} alt="" /> : '👤'}</div>
                            <div className="pvp-name">{user?.hunterName || 'You'}</div>
                            <div className="pvp-level">Lv.{gameState.level}</div>
                        </div>
                        <div className="pvp-vs">VS</div>
                        <div className="pvp-player">
                            <div className="pvp-avatar">{opponent.avatar ? <img src={opponent.avatar} alt="" /> : '👤'}</div>
                            <div className="pvp-name">{opponent.hunterName}</div>
                            <div className="pvp-level">Lv.{opponent.level}</div>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={handleReady}>
                        Ready!
                    </button>
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    // Render countdown
    if (phase === 'countdown') {
        return (
            <div className="pvp-overlay">
                <div className="pvp-container system-window">
                    <h2 className="pvp-title">Battle Starting!</h2>
                    <div className="pvp-countdown">{countdown}</div>
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    // Render battle
    if (phase === 'battle' && questions.length > 0) {
        const question = questions[currentQ];
        const myScore = scores[playerIndex]?.score || 0;
        const oppScore = scores[1 - playerIndex]?.score || 0;

        return (
            <div className="pvp-overlay">
                <div className="pvp-battle-container">
                    {/* Score header */}
                    <div className="pvp-battle-header">
                        <div className="pvp-score-card you">
                            <span className="score-name">You</span>
                            <span className="score-value">{myScore}</span>
                        </div>
                        <div className="pvp-timer">{timeLeft}s</div>
                        <div className="pvp-score-card opp">
                            <span className="score-name">{opponent?.hunterName || 'Opponent'}</span>
                            <span className="score-value">{oppScore}</span>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="pvp-progress">
                        Question {currentQ + 1} / {questions.length}
                    </div>

                    {/* Question */}
                    <div className="pvp-question-card system-window">
                        <div className="pvp-subject-tag">{question.subject}</div>
                        <p className="pvp-question-text">{question.question}</p>

                        <div className="pvp-options">
                            {question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    className={`pvp-option ${selectedAnswer === idx ? 'selected' : ''} ${showExplanation ? (idx === lastResult?.correctAnswer ? 'correct' : (selectedAnswer === idx && !lastResult?.isCorrect ? 'wrong' : '')) : ''
                                        }`}
                                    onClick={() => handleSelectAnswer(idx)}
                                    disabled={submitted}
                                >
                                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                                    {opt}
                                </button>
                            ))}
                        </div>

                        {!submitted && (
                            <button
                                className="btn btn-primary btn-lg pvp-submit"
                                onClick={() => handleSubmit(false)}
                                disabled={selectedAnswer === null}
                            >
                                Submit Answer
                            </button>
                        )}

                        {showExplanation && (
                            <div className={`pvp-feedback ${lastResult?.isCorrect ? 'correct' : 'wrong'}`}>
                                <div className="feedback-icon">{lastResult?.isCorrect ? '✓' : '✗'}</div>
                                <div className="feedback-text">
                                    {lastResult?.isCorrect ? 'Correct!' : 'Incorrect'}
                                </div>
                                {question.explanation && (
                                    <p className="pvp-explanation">{question.explanation}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    // Render result
    if (phase === 'result' && battleResult) {
        const isWinner = battleResult.winner?.username === (user?.username || 'Hunter');
        const isDraw = battleResult.isDraw;

        return (
            <div className="pvp-overlay">
                <div className="pvp-container system-window">
                    <h2 className={`pvp-result-title ${isWinner ? 'win' : isDraw ? 'draw' : 'lose'}`}>
                        {isDraw ? '🤝 Draw!' : isWinner ? '🏆 Victory!' : '💀 Defeat'}
                    </h2>

                    {battleResult.forfeit && (
                        <p className="pvp-forfeit">Opponent disconnected</p>
                    )}

                    <div className="pvp-final-scores">
                        <div className="pvp-final-score you">
                            <span>You</span>
                            <span className="score">{battleResult.finalScores?.player1?.score || scores[playerIndex]?.score || 0}</span>
                        </div>
                        <div className="pvp-final-score opp">
                            <span>{opponent?.hunterName || 'Opponent'}</span>
                            <span className="score">{battleResult.finalScores?.player2?.score || scores[1 - playerIndex]?.score || 0}</span>
                        </div>
                    </div>

                    <div className="pvp-xp-reward">
                        +{battleResult.xpReward} XP
                    </div>

                    <div className="pvp-result-actions">
                        <button className="btn btn-primary" onClick={handlePlayAgain}>
                            Play Again
                        </button>
                        <button className="btn btn-secondary" onClick={onClose}>
                            Exit
                        </button>
                    </div>
                </div>
                <style>{pvpStyles}</style>
            </div>
        );
    }

    return null;
}

const pvpStyles = `
  .pvp-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }
  .pvp-container {
    max-width: 500px;
    width: 100%;
    padding: 40px;
    text-align: center;
  }
  .pvp-title {
    font-size: 1.8rem;
    margin-bottom: 10px;
    color: var(--text-primary);
  }
  .pvp-subtitle {
    color: var(--text-secondary);
    margin-bottom: 30px;
  }
  .pvp-error {
    background: rgba(255, 71, 87, 0.2);
    color: #ff4757;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .pvp-connecting {
    color: var(--accent);
    margin-bottom: 20px;
  }
  .pvp-lobby-options {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .pvp-divider {
    display: flex;
    align-items: center;
    color: var(--text-secondary);
    margin: 10px 0;
  }
  .pvp-divider::before,
  .pvp-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .pvp-divider span {
    padding: 0 15px;
  }
  .pvp-join-section {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .pvp-code-input {
    flex: 1;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1.2rem;
    text-align: center;
    letter-spacing: 4px;
    text-transform: uppercase;
  }
  .pvp-queue-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 30px auto;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .pvp-queue-pos {
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
  .pvp-room-code {
    font-size: 3rem;
    font-weight: bold;
    letter-spacing: 8px;
    color: var(--accent);
    margin: 20px 0;
    font-family: monospace;
  }
  .pvp-waiting {
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
  .pvp-matchup {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 30px;
    margin: 30px 0;
  }
  .pvp-player {
    text-align: center;
  }
  .pvp-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin-bottom: 10px;
    overflow: hidden;
  }
  .pvp-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pvp-name {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .pvp-level {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  .pvp-vs {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent);
  }
  .pvp-countdown {
    font-size: 6rem;
    font-weight: bold;
    color: var(--accent);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
  .pvp-battle-container {
    width: 100%;
    max-width: 700px;
    padding: 20px;
  }
  .pvp-battle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .pvp-score-card {
    background: var(--bg-secondary);
    padding: 15px 25px;
    border-radius: 12px;
    text-align: center;
    min-width: 120px;
  }
  .pvp-score-card .score-name {
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 5px;
  }
  .pvp-score-card .score-value {
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--accent);
  }
  .pvp-timer {
    font-size: 2rem;
    font-weight: bold;
    color: var(--text-primary);
    background: var(--bg-secondary);
    padding: 15px 25px;
    border-radius: 12px;
  }
  .pvp-progress {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: 15px;
  }
  .pvp-question-card {
    padding: 30px;
    text-align: left;
  }
  .pvp-subject-tag {
    display: inline-block;
    background: var(--accent);
    color: var(--bg-primary);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 15px;
  }
  .pvp-question-text {
    font-size: 1.2rem;
    margin-bottom: 25px;
    line-height: 1.5;
  }
  .pvp-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }
  .pvp-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 20px;
    background: var(--bg-secondary);
    border: 2px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    color: var(--text-primary);
    font-size: 1rem;
  }
  .pvp-option:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .pvp-option.selected {
    border-color: var(--accent);
    background: rgba(0, 212, 255, 0.1);
  }
  .pvp-option.correct {
    border-color: #2ed573;
    background: rgba(46, 213, 115, 0.2);
  }
  .pvp-option.wrong {
    border-color: #ff4757;
    background: rgba(255, 71, 87, 0.2);
  }
  .option-letter {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    border-radius: 6px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .pvp-submit {
    width: 100%;
    margin-top: 10px;
  }
  .pvp-feedback {
    margin-top: 20px;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
  }
  .pvp-feedback.correct {
    background: rgba(46, 213, 115, 0.2);
    border: 1px solid #2ed573;
  }
  .pvp-feedback.wrong {
    background: rgba(255, 71, 87, 0.2);
    border: 1px solid #ff4757;
  }
  .feedback-icon {
    font-size: 2rem;
    margin-bottom: 10px;
  }
  .feedback-text {
    font-weight: 600;
    font-size: 1.2rem;
    margin-bottom: 10px;
  }
  .pvp-explanation {
    color: var(--text-secondary);
    font-size: 0.95rem;
    text-align: left;
  }
  .pvp-result-title {
    font-size: 2.5rem;
    margin-bottom: 20px;
  }
  .pvp-result-title.win { color: #ffd700; }
  .pvp-result-title.draw { color: var(--accent); }
  .pvp-result-title.lose { color: #ff4757; }
  .pvp-forfeit {
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
  .pvp-final-scores {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin: 30px 0;
  }
  .pvp-final-score {
    text-align: center;
  }
  .pvp-final-score span:first-child {
    display: block;
    color: var(--text-secondary);
    margin-bottom: 5px;
  }
  .pvp-final-score .score {
    font-size: 2.5rem;
    font-weight: bold;
    color: var(--accent);
  }
  .pvp-xp-reward {
    font-size: 1.5rem;
    color: #ffd700;
    margin-bottom: 30px;
  }
  .pvp-result-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
  }
  .btn-lg {
    padding: 15px 30px;
    font-size: 1.1rem;
  }
`;
