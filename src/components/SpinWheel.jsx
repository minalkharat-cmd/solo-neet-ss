// Spin Wheel Component - Fortune wheel for daily rewards
import { useState, useRef } from 'react';

const WHEEL_SEGMENTS = [
    { label: '+50 XP', type: 'xp', amount: 50, color: '#7B68EE' },
    { label: '+100 XP', type: 'xp', amount: 100, color: '#00D4FF' },
    { label: '📦 Box', type: 'box', amount: 1, color: '#2ED573' },
    { label: '+25 XP', type: 'xp', amount: 25, color: '#FF9800' },
    { label: '2x XP (5min)', type: 'multiplier', amount: 2, color: '#E91E63' },
    { label: '+75 XP', type: 'xp', amount: 75, color: '#9C27B0' },
    { label: '+150 XP', type: 'xp', amount: 150, color: '#FFD700' },
    { label: '+10 XP', type: 'xp', amount: 10, color: '#607D8B' },
];

export function SpinWheel({ spinsRemaining, onSpin, onClose }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState(null);
    const wheelRef = useRef(null);

    const handleSpin = () => {
        if (isSpinning || spinsRemaining <= 0) return;

        setIsSpinning(true);
        setResult(null);

        // Calculate random result
        const segmentAngle = 360 / WHEEL_SEGMENTS.length;
        const randomSegment = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
        const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
        const targetRotation = extraSpins * 360 + (360 - randomSegment * segmentAngle - segmentAngle / 2);

        setRotation((prev) => prev + targetRotation);

        setTimeout(() => {
            setIsSpinning(false);
            const prize = WHEEL_SEGMENTS[randomSegment];
            setResult(prize);
            onSpin(prize);
        }, 4000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal system-window spin-wheel-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 className="modal-title">🎡 Fortune Wheel</h2>

                <div className="spins-remaining">
                    <span className="spin-icon">🎫</span>
                    <span className="spin-count">{spinsRemaining}</span>
                    <span className="spin-label">Spins Left</span>
                </div>

                <div className="wheel-container">
                    <div className="wheel-pointer">▼</div>
                    <svg
                        ref={wheelRef}
                        className="wheel"
                        viewBox="0 0 200 200"
                        style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
                    >
                        {WHEEL_SEGMENTS.map((segment, index) => {
                            const angle = (360 / WHEEL_SEGMENTS.length);
                            const startAngle = index * angle - 90;
                            const endAngle = startAngle + angle;
                            const largeArc = angle > 180 ? 1 : 0;

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;

                            const x1 = 100 + 95 * Math.cos(startRad);
                            const y1 = 100 + 95 * Math.sin(startRad);
                            const x2 = 100 + 95 * Math.cos(endRad);
                            const y2 = 100 + 95 * Math.sin(endRad);

                            const textAngle = startAngle + angle / 2;
                            const textRad = (textAngle * Math.PI) / 180;
                            const textX = 100 + 60 * Math.cos(textRad);
                            const textY = 100 + 60 * Math.sin(textRad);

                            return (
                                <g key={index}>
                                    <path
                                        d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                        fill={segment.color}
                                        stroke="#1a1a2e"
                                        strokeWidth="2"
                                    />
                                    <text
                                        x={textX}
                                        y={textY}
                                        fill="white"
                                        fontSize="8"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                                    >
                                        {segment.label}
                                    </text>
                                </g>
                            );
                        })}
                        <circle cx="100" cy="100" r="15" fill="#1a1a2e" stroke="#7B68EE" strokeWidth="3" />
                    </svg>
                </div>

                {result && (
                    <div className="spin-result animate-slide-up">
                        <span className="result-label">You Won:</span>
                        <span className="result-prize" style={{ color: result.color }}>{result.label}</span>
                    </div>
                )}

                <button
                    className={`btn btn-primary btn-lg spin-btn ${isSpinning || spinsRemaining <= 0 ? 'disabled' : ''}`}
                    onClick={handleSpin}
                    disabled={isSpinning || spinsRemaining <= 0}
                >
                    {isSpinning ? '🎰 Spinning...' : spinsRemaining > 0 ? '🎡 SPIN!' : 'No Spins Left'}
                </button>
            </div>
        </div>
    );
}
