// Mystery Box Component - Gacha-style rewards
import { useState } from 'react';

const RARITIES = {
    common: { name: 'Common', color: '#808080', chance: 0.5 },
    rare: { name: 'Rare', color: '#2196F3', chance: 0.3 },
    epic: { name: 'Epic', color: '#9C27B0', chance: 0.15 },
    legendary: { name: 'Legendary', color: '#FFD700', chance: 0.05 },
};

const REWARDS = [
    { rarity: 'common', type: 'xp', amount: 25, label: '+25 XP' },
    { rarity: 'common', type: 'xp', amount: 50, label: '+50 XP' },
    { rarity: 'rare', type: 'xp', amount: 100, label: '+100 XP' },
    { rarity: 'rare', type: 'xp', amount: 150, label: '+150 XP' },
    { rarity: 'epic', type: 'xp', amount: 300, label: '+300 XP' },
    { rarity: 'epic', type: 'multiplier', amount: 2, duration: 300000, label: '2x XP (5min)' },
    { rarity: 'legendary', type: 'xp', amount: 500, label: '+500 XP' },
    { rarity: 'legendary', type: 'multiplier', amount: 3, duration: 600000, label: '3x XP (10min)' },
];

function getRandomReward() {
    const roll = Math.random();
    let rarity;

    if (roll < RARITIES.legendary.chance) rarity = 'legendary';
    else if (roll < RARITIES.legendary.chance + RARITIES.epic.chance) rarity = 'epic';
    else if (roll < RARITIES.legendary.chance + RARITIES.epic.chance + RARITIES.rare.chance) rarity = 'rare';
    else rarity = 'common';

    const possibleRewards = REWARDS.filter(r => r.rarity === rarity);
    return possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
}

export function MysteryBox({ boxesRemaining, onOpen, onClose }) {
    const [isOpening, setIsOpening] = useState(false);
    const [stage, setStage] = useState('idle'); // idle, shaking, opening, revealed
    const [reward, setReward] = useState(null);

    const handleOpen = () => {
        if (isOpening || boxesRemaining <= 0) return;

        setIsOpening(true);
        setStage('shaking');

        setTimeout(() => {
            setStage('opening');
        }, 1000);

        setTimeout(() => {
            const prize = getRandomReward();
            setReward(prize);
            setStage('revealed');
            onOpen(prize);
        }, 2000);

        setTimeout(() => {
            setIsOpening(false);
        }, 2500);
    };

    const handleAnother = () => {
        setStage('idle');
        setReward(null);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal system-window mystery-box-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 className="modal-title">📦 Mystery Box</h2>

                <div className="boxes-remaining">
                    <span className="box-icon">📦</span>
                    <span className="box-count">{boxesRemaining}</span>
                    <span className="box-label">Boxes Available</span>
                </div>

                <div className="box-container">
                    {stage === 'idle' && (
                        <div className="mystery-box idle">
                            <span className="box-emoji">📦</span>
                            <span className="box-question">?</span>
                        </div>
                    )}

                    {stage === 'shaking' && (
                        <div className="mystery-box shaking">
                            <span className="box-emoji">📦</span>
                        </div>
                    )}

                    {stage === 'opening' && (
                        <div className="mystery-box opening">
                            <div className="burst-particles">
                                {[...Array(12)].map((_, i) => (
                                    <span key={i} className="particle" style={{ '--angle': `${i * 30}deg` }}>✨</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {stage === 'revealed' && reward && (
                        <div className="mystery-box revealed">
                            <div className="rarity-badge" style={{ background: RARITIES[reward.rarity].color }}>
                                {RARITIES[reward.rarity].name}
                            </div>
                            <div className="reward-reveal" style={{ color: RARITIES[reward.rarity].color }}>
                                {reward.label}
                            </div>
                        </div>
                    )}
                </div>

                {stage === 'revealed' ? (
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleAnother}
                        disabled={boxesRemaining <= 1}
                    >
                        {boxesRemaining > 1 ? 'Open Another' : 'No More Boxes'}
                    </button>
                ) : (
                    <button
                        className={`btn btn-primary btn-lg ${isOpening || boxesRemaining <= 0 ? 'disabled' : ''}`}
                        onClick={handleOpen}
                        disabled={isOpening || boxesRemaining <= 0}
                    >
                        {isOpening ? '✨ Opening...' : boxesRemaining > 0 ? '🎁 Open Box' : 'No Boxes Left'}
                    </button>
                )}
            </div>
        </div>
    );
}
