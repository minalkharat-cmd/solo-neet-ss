// Leaderboard Component - Shadow Monarch Rankings
import { useState, useEffect } from 'react';
import { getRankFromLevel } from '../data';

// Generate mock leaderboard data (in real app, this would come from backend)
const generateMockLeaderboard = (playerXP, playerLevel) => {
    const names = [
        'ShadowDoc', 'CardioKing', 'NeuroNinja', 'MedMaster', 'HunterMD',
        'BrainBoss', 'HeartHero', 'GutGuru', 'RenalRuler', 'LungLord',
        'OncoOracle', 'EndoExpert', 'RheumaRex', 'BloodBaron', 'ICUKing',
        'NeoNinja', 'SpecialistX', 'DragonDoc', 'PhoenixMD', 'TitanMD'
    ];

    const leaderboard = names.map((name, index) => {
        const baseXP = 50000 - (index * 2000) + Math.floor(Math.random() * 1000);
        const level = Math.min(100, Math.floor(baseXP / 500) + 1);
        return {
            rank: index + 1,
            name,
            xp: baseXP,
            level,
            isPlayer: false,
        };
    });

    // Insert player at appropriate position
    const playerEntry = {
        name: 'You',
        xp: playerXP,
        level: playerLevel,
        isPlayer: true,
    };

    const playerRank = leaderboard.filter(e => e.xp > playerXP).length + 1;
    playerEntry.rank = playerRank;

    // Adjust ranks after player
    leaderboard.forEach(e => {
        if (e.rank >= playerRank) e.rank++;
    });

    leaderboard.push(playerEntry);
    leaderboard.sort((a, b) => a.rank - b.rank);

    return leaderboard.slice(0, 20);
};

export function Leaderboard({ gameState, onClose }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [filter, setFilter] = useState('global'); // global, weekly, friends

    useEffect(() => {
        setLeaderboard(generateMockLeaderboard(gameState.totalXP, gameState.level));
    }, [gameState.totalXP, gameState.level]);

    const getMedalEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg system-window leaderboard-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 className="modal-title">🏆 Shadow Monarch Rankings</h2>

                <div className="leaderboard-filters">
                    {['global', 'weekly'].map((f) => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'global' ? '🌍 Global' : '📅 Weekly'}
                        </button>
                    ))}
                </div>

                <div className="leaderboard-podium">
                    {leaderboard.slice(0, 3).map((entry, index) => {
                        const rankInfo = getRankFromLevel(entry.level);
                        return (
                            <div key={entry.name} className={`podium-spot place-${index + 1} ${entry.isPlayer ? 'is-player' : ''}`}>
                                <div className="podium-medal">{getMedalEmoji(entry.rank)}</div>
                                <div className="podium-avatar" style={{ borderColor: rankInfo.color }}>
                                    <span style={{ color: rankInfo.color }}>{entry.name.substring(0, 2).toUpperCase()}</span>
                                </div>
                                <div className="podium-name">{entry.name}</div>
                                <div className="podium-xp">{entry.xp.toLocaleString()} XP</div>
                                <div className="podium-rank" style={{ color: rankInfo.color }}>
                                    {rankInfo.rank}-Rank
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="leaderboard-list">
                    {leaderboard.slice(3).map((entry) => {
                        const rankInfo = getRankFromLevel(entry.level);
                        return (
                            <div key={entry.name} className={`leaderboard-entry ${entry.isPlayer ? 'is-player' : ''}`}>
                                <div className="entry-rank">{getMedalEmoji(entry.rank)}</div>
                                <div className="entry-avatar" style={{ borderColor: rankInfo.color }}>
                                    <span style={{ color: rankInfo.color }}>{entry.name.substring(0, 2).toUpperCase()}</span>
                                </div>
                                <div className="entry-info">
                                    <div className="entry-name">{entry.name}</div>
                                    <div className="entry-details">
                                        <span className="entry-level">Lv.{entry.level}</span>
                                        <span className="entry-hunter-rank" style={{ color: rankInfo.color }}>
                                            {rankInfo.rank}-Rank
                                        </span>
                                    </div>
                                </div>
                                <div className="entry-xp">{entry.xp.toLocaleString()} XP</div>
                            </div>
                        );
                    })}
                </div>

                <div className="player-rank-summary">
                    <span>Your Rank: </span>
                    <strong>#{leaderboard.find(e => e.isPlayer)?.rank || '?'}</strong>
                </div>
            </div>
        </div>
    );
}
