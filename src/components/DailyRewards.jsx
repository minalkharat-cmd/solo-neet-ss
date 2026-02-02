// Daily Rewards Component - 7-day login streak system
import { useState, useEffect } from 'react';

const REWARDS = [
    { day: 1, type: 'xp', amount: 50, icon: '⭐' },
    { day: 2, type: 'xp', amount: 100, icon: '⭐' },
    { day: 3, type: 'box', amount: 1, icon: '📦' },
    { day: 4, type: 'xp', amount: 150, icon: '⭐' },
    { day: 5, type: 'spin', amount: 2, icon: '🎡' },
    { day: 6, type: 'xp', amount: 200, icon: '⭐' },
    { day: 7, type: 'box', amount: 3, icon: '🎁', special: true },
];

export function DailyRewards({ streak, lastClaim, onClaim, onClose }) {
    const [canClaim, setCanClaim] = useState(false);
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        const today = new Date().toDateString();
        setCanClaim(lastClaim !== today);
    }, [lastClaim]);

    const handleClaim = () => {
        if (!canClaim || claimed) return;
        const dayIndex = streak % 7;
        const reward = REWARDS[dayIndex];
        onClaim(reward);
        setClaimed(true);
    };

    const currentDay = (streak % 7) + 1;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal system-window daily-rewards-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 className="modal-title">🔥 Daily Rewards</h2>

                <div className="streak-display">
                    <span className="streak-flame">🔥</span>
                    <span className="streak-count">{streak}</span>
                    <span className="streak-label">Day Streak</span>
                </div>

                <div className="rewards-grid">
                    {REWARDS.map((reward, index) => {
                        const isPast = index < (streak % 7);
                        const isCurrent = index === (streak % 7);
                        const isLocked = index > (streak % 7);

                        return (
                            <div
                                key={reward.day}
                                className={`reward-card ${isPast ? 'claimed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''} ${reward.special ? 'special' : ''}`}
                            >
                                <div className="reward-day">Day {reward.day}</div>
                                <div className="reward-icon">{reward.icon}</div>
                                <div className="reward-amount">
                                    {reward.type === 'xp' && `+${reward.amount} XP`}
                                    {reward.type === 'box' && `${reward.amount} Box${reward.amount > 1 ? 'es' : ''}`}
                                    {reward.type === 'spin' && `${reward.amount} Spins`}
                                </div>
                                {isPast && <div className="reward-check">✓</div>}
                            </div>
                        );
                    })}
                </div>

                <button
                    className={`btn btn-primary btn-lg claim-btn ${!canClaim || claimed ? 'disabled' : ''}`}
                    onClick={handleClaim}
                    disabled={!canClaim || claimed}
                >
                    {claimed ? '✓ Claimed!' : canClaim ? `Claim Day ${currentDay} Reward` : 'Come Back Tomorrow'}
                </button>
            </div>
        </div>
    );
}
