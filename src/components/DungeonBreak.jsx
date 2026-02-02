// Dungeon Break Component - Random boss encounters
import { useState, useEffect, useRef } from 'react';

const BOSSES = [
    { id: 'cardiac_king', name: 'Cardiac King', icon: '👹', subject: 'cardiology', hp: 3, reward: 300 },
    { id: 'neuro_nightmare', name: 'Neuro Nightmare', icon: '🧟', subject: 'neurology', hp: 3, reward: 300 },
    { id: 'gastro_giant', name: 'Gastro Giant', icon: '👾', subject: 'gastro', hp: 3, reward: 300 },
    { id: 'renal_reaper', name: 'Renal Reaper', icon: '💀', subject: 'nephrology', hp: 4, reward: 400 },
    { id: 'lung_lord', name: 'Lung Lord', icon: '🐉', subject: 'pulmonology', hp: 4, reward: 400 },
    { id: 'cancer_colossus', name: 'Cancer Colossus', icon: '👿', subject: 'oncology', hp: 5, reward: 500 },
];

export function DungeonBreak({ questions, onComplete, onClose, soundEnabled }) {
    const [boss] = useState(() => BOSSES[Math.floor(Math.random() * BOSSES.length)]);
    const [stage, setStage] = useState('alert'); // alert, battle, victory, defeat
    const [bossHP, setBossHP] = useState(boss.hp);
    const [playerHP, setPlayerHP] = useState(3);
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(20);
    const [totalDamage, setTotalDamage] = useState(0);
    const timerRef = useRef(null);

    // Get boss questions from the relevant subject
    const bossQuestions = questions[boss.subject]?.slice(0, boss.hp + 2) || [];

    useEffect(() => {
        if (stage === 'alert') {
            const timer = setTimeout(() => setStage('battle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [stage]);

    // Timer for battle
    useEffect(() => {
        if (stage !== 'battle' || isSubmitted) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [stage, currentQ, isSubmitted]);

    const handleTimeout = () => {
        setIsSubmitted(true);
        setPlayerHP((prev) => prev - 1);
        if (playerHP <= 1) {
            setTimeout(() => setStage('defeat'), 1500);
        }
    };

    const handleSelect = (index) => {
        if (isSubmitted) return;
        setSelectedAnswer(index);
    };

    const handleSubmit = () => {
        if (selectedAnswer === null || isSubmitted) return;

        clearInterval(timerRef.current);
        setIsSubmitted(true);

        const question = bossQuestions[currentQ];
        const isCorrect = selectedAnswer === question.correct;

        if (isCorrect) {
            const damage = question.xp;
            setTotalDamage((prev) => prev + damage);
            setBossHP((prev) => {
                const newHP = prev - 1;
                if (newHP <= 0) {
                    setTimeout(() => setStage('victory'), 1500);
                }
                return newHP;
            });
        } else {
            setPlayerHP((prev) => {
                const newHP = prev - 1;
                if (newHP <= 0) {
                    setTimeout(() => setStage('defeat'), 1500);
                }
                return newHP;
            });
        }
    };

    const handleNext = () => {
        if (bossHP <= 0 || playerHP <= 0) return;

        setCurrentQ((prev) => prev + 1);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setTimeLeft(20);
    };

    const handleExit = (won) => {
        onComplete(won, won ? boss.reward : Math.floor(totalDamage / 2));
        onClose();
    };

    if (stage === 'alert') {
        return (
            <div className="dungeon-break-overlay">
                <div className="dungeon-break-alert animate-pulse">
                    <div className="alert-icon">🚨</div>
                    <h1 className="alert-title">DUNGEON BREAK!</h1>
                    <div className="boss-reveal">
                        <span className="boss-icon">{boss.icon}</span>
                        <span className="boss-name">{boss.name}</span>
                    </div>
                    <p className="alert-subtitle">A boss has appeared!</p>
                </div>
            </div>
        );
    }

    if (stage === 'victory') {
        return (
            <div className="dungeon-break-overlay">
                <div className="dungeon-break-result victory">
                    <div className="result-icon">🏆</div>
                    <h1 className="result-title">BOSS DEFEATED!</h1>
                    <div className="boss-defeated">
                        <span className="boss-icon grayscale">{boss.icon}</span>
                    </div>
                    <div className="result-reward">
                        <span className="reward-label">Reward:</span>
                        <span className="reward-xp">+{boss.reward} XP</span>
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={() => handleExit(true)}>
                        Claim Victory
                    </button>
                </div>
            </div>
        );
    }

    if (stage === 'defeat') {
        return (
            <div className="dungeon-break-overlay">
                <div className="dungeon-break-result defeat">
                    <div className="result-icon">💀</div>
                    <h1 className="result-title">DEFEATED...</h1>
                    <div className="boss-victorious">
                        <span className="boss-icon">{boss.icon}</span>
                    </div>
                    <div className="result-reward">
                        <span className="reward-label">Consolation:</span>
                        <span className="reward-xp">+{Math.floor(totalDamage / 2)} XP</span>
                    </div>
                    <button className="btn btn-secondary btn-lg" onClick={() => handleExit(false)}>
                        Retreat
                    </button>
                </div>
            </div>
        );
    }

    const question = bossQuestions[currentQ];
    if (!question) {
        handleExit(bossHP <= 0);
        return null;
    }

    return (
        <div className="dungeon-break-overlay">
            <div className="dungeon-break-battle">
                <div className="battle-header boss-header">
                    <div className="boss-info">
                        <span className="boss-icon">{boss.icon}</span>
                        <span className="boss-name">{boss.name}</span>
                    </div>
                    <div className="boss-hp-bar">
                        <div className="hp-fill boss" style={{ width: `${(bossHP / boss.hp) * 100}%` }} />
                        <span className="hp-text">{bossHP}/{boss.hp}</span>
                    </div>
                </div>

                <div className="battle-timer-container">
                    <div className={`battle-timer ${timeLeft <= 5 ? 'critical' : ''}`}>
                        ⏱️ {timeLeft}s
                    </div>
                </div>

                <div className="question-card system-window">
                    <div className="question-meta">
                        <span className={`difficulty-badge ${question.difficulty}`}>
                            {question.difficulty.toUpperCase()}
                        </span>
                    </div>
                    <h3 className="question-text">{question.question}</h3>
                </div>

                <div className="options-grid">
                    {question.options.map((option, index) => {
                        let optionClass = 'option-btn';
                        if (isSubmitted) {
                            if (index === question.correct) optionClass += ' correct';
                            else if (index === selectedAnswer) optionClass += ' wrong';
                        } else if (index === selectedAnswer) {
                            optionClass += ' selected';
                        }

                        return (
                            <button key={index} className={optionClass} onClick={() => handleSelect(index)} disabled={isSubmitted}>
                                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                <span className="option-text">{option}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="player-status">
                    <div className="player-hp">
                        {'❤️'.repeat(playerHP)}{'🖤'.repeat(3 - playerHP)}
                    </div>
                </div>

                <div className="battle-actions">
                    {!isSubmitted ? (
                        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={selectedAnswer === null}>
                            Attack!
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-lg" onClick={handleNext}>
                            {bossHP <= 0 || playerHP <= 0 ? 'See Result' : 'Continue'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
