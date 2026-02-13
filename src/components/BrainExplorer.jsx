import { useState, useEffect, useCallback } from 'react';
import { brainRegions, brainQuizQuestions, categoryLabels } from '../data/brainAnatomy';

// ─── SVG Brain Diagram (Medial Sagittal View) ───────────────────────────
// Hand-crafted paths representing an anatomically-inspired sagittal brain section.
// Each region is a clickable SVG path with hover/select states.

const BRAIN_PATHS = {
    'frontal-lobe': {
        d: 'M 140,60 C 120,55 90,65 70,90 C 55,110 45,140 45,170 C 45,200 50,225 65,245 C 75,260 90,268 110,272 L 175,275 L 185,250 L 190,220 L 188,185 L 182,155 L 178,130 C 175,110 168,90 160,75 Z',
        label: { x: 120, y: 170 },
    },
    'parietal-lobe': {
        d: 'M 178,130 C 182,110 190,90 200,75 C 210,60 225,52 245,50 C 265,50 280,55 290,65 C 300,78 305,95 305,115 L 300,145 L 290,170 L 275,190 L 255,205 L 235,215 L 210,225 L 190,220 L 188,185 L 182,155 Z',
        label: { x: 245, y: 140 },
    },
    'temporal-lobe': {
        d: 'M 110,272 C 100,278 85,290 80,310 C 75,330 78,348 90,358 C 105,370 130,375 160,372 C 190,370 210,360 225,348 C 235,340 240,328 238,315 L 235,295 L 225,280 L 210,270 L 195,265 L 185,260 L 175,275 Z',
        label: { x: 155, y: 330 },
    },
    'occipital-lobe': {
        d: 'M 305,115 C 310,135 315,160 318,185 C 320,210 318,235 310,255 C 305,268 295,280 282,288 C 270,295 258,298 245,295 L 238,315 C 240,328 235,340 225,348 C 240,345 260,335 275,320 C 295,300 315,275 325,245 C 335,215 338,185 335,155 C 332,130 325,110 315,100 Z',
        label: { x: 310, y: 200 },
    },
    'cerebellum': {
        d: 'M 245,295 C 258,298 270,300 285,310 C 300,320 310,335 312,352 C 314,368 308,382 295,392 C 278,405 255,410 230,408 C 205,405 188,395 178,382 C 168,368 168,352 175,340 C 182,328 195,318 210,312 L 225,348 C 210,360 190,370 160,372 C 175,385 200,400 230,404',
        label: { x: 248, y: 365 },
    },
    'brainstem': {
        d: 'M 210,312 C 200,310 192,315 188,325 C 184,338 183,355 186,375 C 188,390 192,405 198,418 C 202,428 208,435 215,438 C 222,435 228,428 232,418 C 238,405 242,390 244,375 C 247,355 246,338 242,325 C 238,315 230,310 225,348 L 210,312',
        label: { x: 215, y: 395 },
    },
    'thalamus': {
        d: 'M 195,235 C 192,228 193,218 200,212 C 208,205 220,200 232,202 C 244,204 252,212 255,222 C 258,232 255,242 248,250 C 240,258 228,262 216,260 C 205,257 198,248 195,235 Z',
        label: { x: 225, y: 232 },
    },
    'hypothalamus': {
        d: 'M 175,260 C 172,268 173,278 180,285 C 188,292 200,296 212,294 C 222,292 228,286 230,278 C 232,270 228,262 220,256 C 212,252 200,250 190,252 C 182,254 177,256 175,260 Z',
        label: { x: 202, y: 275 },
    },
    'basal-ganglia': {
        d: 'M 165,200 C 162,192 165,183 172,178 C 180,173 190,172 198,175 C 205,178 208,185 208,194 C 208,203 204,210 197,214 C 190,218 180,218 172,214 C 166,210 164,206 165,200 Z',
        label: { x: 186, y: 196 },
    },
    'limbic-system': {
        d: 'M 155,175 C 150,165 150,152 157,143 C 165,135 178,132 190,135 C 200,138 208,145 212,155 C 215,162 215,170 212,178 L 208,194 C 204,186 196,180 186,178 L 182,175 Z',
        label: { x: 180, y: 155 },
    },
    'corpus-callosum': {
        d: 'M 148,148 C 165,138 190,132 215,130 C 240,128 260,132 275,140 C 282,144 285,150 283,156 C 280,162 272,166 260,168 C 240,170 215,170 195,168 C 175,166 160,162 152,156 C 148,153 147,150 148,148 Z',
        label: { x: 215, y: 152 },
    },
    'spinal-cord': {
        d: 'M 208,435 C 206,445 204,458 203,472 C 202,486 202,500 204,510 C 205,516 208,520 215,520 C 222,520 225,516 226,510 C 228,500 228,486 227,472 C 226,458 224,445 222,435 Z',
        label: { x: 215, y: 480 },
    },
};

function BrainSVG({ selectedRegion, hoveredRegion, onRegionClick, onRegionHover, exploredRegions, quizHighlight }) {
    return (
        <svg viewBox="20 30 350 510" className="brain-svg" aria-label="Interactive brain diagram">
            {/* Brain outline glow */}
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="selectedGlow">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="pulseGlow">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Render each brain region */}
            {brainRegions.map((region) => {
                const pathData = BRAIN_PATHS[region.id];
                if (!pathData) return null;

                const isSelected = selectedRegion === region.id;
                const isHovered = hoveredRegion === region.id;
                const isExplored = exploredRegions.has(region.id);
                const isQuizTarget = quizHighlight === region.id;

                let opacity = 0.6;
                let strokeWidth = 1;
                let filter = '';
                let fillColor = region.color;

                if (isQuizTarget) {
                    opacity = 0.9;
                    strokeWidth = 3;
                    filter = 'url(#pulseGlow)';
                } else if (isSelected) {
                    opacity = 0.85;
                    strokeWidth = 2.5;
                    filter = 'url(#selectedGlow)';
                } else if (isHovered) {
                    opacity = 0.75;
                    strokeWidth = 2;
                    filter = 'url(#glow)';
                } else if (isExplored) {
                    opacity = 0.5;
                }

                return (
                    <g key={region.id}>
                        <path
                            d={pathData.d}
                            fill={fillColor}
                            fillOpacity={opacity}
                            stroke={isSelected || isHovered || isQuizTarget ? '#fff' : region.color}
                            strokeWidth={strokeWidth}
                            strokeOpacity={0.8}
                            filter={filter}
                            className={`brain-region-path ${isQuizTarget ? 'brain-region-pulse' : ''}`}
                            onClick={() => onRegionClick(region.id)}
                            onMouseEnter={() => onRegionHover(region.id)}
                            onMouseLeave={() => onRegionHover(null)}
                            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                            role="button"
                            tabIndex={0}
                            aria-label={region.name}
                            onKeyDown={(e) => { if (e.key === 'Enter') onRegionClick(region.id); }}
                        />
                        {/* Region label */}
                        <text
                            x={pathData.label.x}
                            y={pathData.label.y}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="9"
                            fontFamily="Rajdhani, sans-serif"
                            fontWeight="600"
                            pointerEvents="none"
                            opacity={isSelected || isHovered ? 1 : 0.7}
                        >
                            {region.name.length > 14
                                ? region.name.split(' ').map((w, i) => (
                                    <tspan key={i} x={pathData.label.x} dy={i === 0 ? 0 : 11}>{w}</tspan>
                                ))
                                : region.name
                            }
                        </text>
                        {/* Explored indicator */}
                        {isExplored && !isSelected && (
                            <text
                                x={pathData.label.x + 25}
                                y={pathData.label.y - 10}
                                fontSize="10"
                                pointerEvents="none"
                            >
                                ✓
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Region Info Panel ────────────────────────────────────────────────────
function RegionInfoPanel({ region, onClose, onStartQuiz }) {
    const [activeTab, setActiveTab] = useState('functions');

    if (!region) return null;

    const tabs = [
        { id: 'functions', label: 'Functions' },
        { id: 'clinical', label: 'Clinical' },
        { id: 'highyield', label: 'NEET HY' },
        { id: 'connections', label: 'Connections' },
    ];

    const connectedNames = region.connections
        .map((id) => brainRegions.find((r) => r.id === id))
        .filter(Boolean);

    return (
        <div className="brain-info-panel system-window">
            <div className="brain-info-header" style={{ borderLeft: `4px solid ${region.color}` }}>
                <div>
                    <h3 className="brain-info-title" style={{ color: region.color }}>{region.name}</h3>
                    <span className="brain-info-category">{categoryLabels[region.category]}</span>
                </div>
                <button className="modal-close" onClick={onClose} style={{ position: 'static' }}>×</button>
            </div>

            <div className="brain-info-blood">
                <span className="brain-info-blood-label">Blood Supply:</span> {region.bloodSupply}
            </div>

            <div className="brain-info-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`brain-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="brain-info-content">
                {activeTab === 'functions' && (
                    <ul className="brain-info-list">
                        {region.functions.map((fn, i) => (
                            <li key={i} className="brain-info-item">{fn}</li>
                        ))}
                    </ul>
                )}

                {activeTab === 'clinical' && (
                    <ul className="brain-info-list clinical">
                        {region.clinicalPearls.map((pearl, i) => (
                            <li key={i} className="brain-info-item clinical-pearl">{pearl}</li>
                        ))}
                    </ul>
                )}

                {activeTab === 'highyield' && (
                    <ul className="brain-info-list highyield">
                        {region.neetHighYield.map((fact, i) => (
                            <li key={i} className="brain-info-item highyield-fact">{fact}</li>
                        ))}
                    </ul>
                )}

                {activeTab === 'connections' && (
                    <div className="brain-connections">
                        <p className="connections-label">Connected structures:</p>
                        <div className="connections-grid">
                            {connectedNames.map((conn) => (
                                <span key={conn.id} className="connection-chip" style={{ borderColor: conn.color, color: conn.color }}>
                                    {conn.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button className="btn btn-primary brain-quiz-btn" onClick={() => onStartQuiz(region.id)}>
                Test Knowledge
            </button>
        </div>
    );
}

// ─── Quiz Mode ────────────────────────────────────────────────────────────
function BrainQuiz({ regionId, onComplete, onExit, onAnswer }) {
    const [allQuestions] = useState(() => {
        if (regionId) return brainQuizQuestions.filter((q) => q.regionId === regionId);
        const arr = [...brainQuizQuestions];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.slice(0, 10);
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);

    const question = allQuestions[currentIndex];

    if (!question || finished) {
        const total = allQuestions.length;
        const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

        return (
            <div className="brain-quiz-result system-window">
                <h3>{accuracy >= 70 ? 'Excellent!' : accuracy >= 40 ? 'Good Effort!' : 'Keep Studying!'}</h3>
                <div className="quiz-result-stats">
                    <div className="quiz-result-stat">
                        <span className="stat-value">{score}/{total}</span>
                        <span className="stat-label">Correct</span>
                    </div>
                    <div className="quiz-result-stat">
                        <span className="stat-value">{accuracy}%</span>
                        <span className="stat-label">Accuracy</span>
                    </div>
                    <div className="quiz-result-stat">
                        <span className="stat-value">+{score * 25}</span>
                        <span className="stat-label">XP Earned</span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => { onComplete(score, total); onExit(); }}>
                    Return to Brain Map
                </button>
            </div>
        );
    }

    const handleSubmit = () => {
        if (selected === null) return;
        setSubmitted(true);
        const isCorrect = selected === question.correct;
        if (isCorrect) setScore((s) => s + 1);
        onAnswer(isCorrect, isCorrect ? question.xp : 0);
    };

    const handleNext = () => {
        if (currentIndex >= allQuestions.length - 1) {
            setFinished(true);
            return;
        }
        setCurrentIndex((i) => i + 1);
        setSelected(null);
        setSubmitted(false);
    };

    return (
        <div className="brain-quiz system-window">
            <div className="brain-quiz-header">
                <span className="brain-quiz-progress">Q {currentIndex + 1}/{allQuestions.length}</span>
                <span className={`difficulty-badge ${question.difficulty}`}>{question.difficulty.toUpperCase()}</span>
                <span className="xp-badge">+{question.xp} XP</span>
            </div>

            <p className="brain-quiz-question">{question.question}</p>

            <div className="brain-quiz-options">
                {question.options.map((opt, i) => {
                    let cls = 'brain-quiz-option';
                    if (submitted) {
                        if (i === question.correct) cls += ' correct';
                        else if (i === selected) cls += ' wrong';
                    } else if (i === selected) {
                        cls += ' selected';
                    }
                    return (
                        <button key={i} className={cls} onClick={() => !submitted && setSelected(i)} disabled={submitted}>
                            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                            {opt}
                        </button>
                    );
                })}
            </div>

            {submitted && (
                <div className="brain-quiz-explanation">
                    {question.explanation}
                </div>
            )}

            <div className="brain-quiz-actions">
                {!submitted ? (
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={selected === null}>Submit</button>
                ) : (
                    <button className="btn btn-primary" onClick={handleNext}>
                        {currentIndex >= allQuestions.length - 1 ? 'See Results' : 'Next'}
                    </button>
                )}
                <button className="btn btn-secondary" onClick={onExit}>Exit Quiz</button>
            </div>
        </div>
    );
}

// ─── Main Brain Explorer Component ────────────────────────────────────────
export function BrainExplorer({ onClose, addXP, soundEnabled }) {
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [hoveredRegion, setHoveredRegion] = useState(null);
    const [mode, setMode] = useState('explore'); // explore | quiz
    const [quizRegion, setQuizRegion] = useState(null);
    const [exploredRegions, setExploredRegions] = useState(() => {
        try {
            const stored = localStorage.getItem('soloNeetSS_exploredBrainRegions');
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch { return new Set(); }
    });
    const [discoveryXP, setDiscoveryXP] = useState(0);
    const [showDiscoveryToast, setShowDiscoveryToast] = useState(false);

    // Persist explored regions
    useEffect(() => {
        localStorage.setItem('soloNeetSS_exploredBrainRegions', JSON.stringify([...exploredRegions]));
    }, [exploredRegions]);

    const handleRegionClick = useCallback((regionId) => {
        setSelectedRegion(regionId);

        // Award XP for discovering a new region
        if (!exploredRegions.has(regionId)) {
            setExploredRegions((prev) => {
                const next = new Set(prev);
                next.add(regionId);
                return next;
            });
            const xpReward = 10;
            setDiscoveryXP(xpReward);
            setShowDiscoveryToast(true);
            if (addXP) addXP(xpReward);
            setTimeout(() => setShowDiscoveryToast(false), 2000);
        }
    }, [exploredRegions, addXP]);

    const handleStartQuiz = useCallback((regionId) => {
        setQuizRegion(regionId || null);
        setMode('quiz');
    }, []);

    const handleQuizComplete = useCallback(() => {
        // XP already awarded per-question in handleQuizAnswer
    }, []);

    const handleQuizAnswer = useCallback((isCorrect, xp) => {
        if (isCorrect && xp > 0 && addXP) {
            addXP(xp);
        }
    }, [addXP]);

    const selectedData = selectedRegion ? brainRegions.find((r) => r.id === selectedRegion) : null;

    const explorationProgress = Math.round((exploredRegions.size / brainRegions.length) * 100);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-xl system-window brain-explorer-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="brain-explorer-header">
                    <h2 className="modal-title">Neural Atlas</h2>
                    <div className="brain-explorer-stats">
                        <div className="brain-stat">
                            <span className="brain-stat-value">{exploredRegions.size}/{brainRegions.length}</span>
                            <span className="brain-stat-label">Explored</span>
                        </div>
                        <div className="brain-progress-bar">
                            <div className="brain-progress-fill" style={{ width: `${explorationProgress}%` }} />
                        </div>
                        <div className="brain-mode-toggle">
                            <button
                                className={`brain-mode-btn ${mode === 'explore' ? 'active' : ''}`}
                                onClick={() => setMode('explore')}
                            >
                                Explore
                            </button>
                            <button
                                className={`brain-mode-btn ${mode === 'quiz' ? 'active' : ''}`}
                                onClick={() => handleStartQuiz(null)}
                            >
                                Quiz
                            </button>
                        </div>
                    </div>
                </div>

                {mode === 'explore' ? (
                    <div className="brain-explorer-body">
                        <div className="brain-diagram-container">
                            <BrainSVG
                                selectedRegion={selectedRegion}
                                hoveredRegion={hoveredRegion}
                                onRegionClick={handleRegionClick}
                                onRegionHover={setHoveredRegion}
                                exploredRegions={exploredRegions}
                                quizHighlight={null}
                            />

                            {/* Hover tooltip */}
                            {hoveredRegion && !selectedRegion && (
                                <div className="brain-tooltip">
                                    {brainRegions.find((r) => r.id === hoveredRegion)?.name}
                                    <span className="brain-tooltip-hint">Click to explore</span>
                                </div>
                            )}

                            {/* Discovery toast */}
                            {showDiscoveryToast && (
                                <div className="brain-discovery-toast animate-slide-up">
                                    +{discoveryXP} XP — New region discovered!
                                </div>
                            )}
                        </div>

                        <div className="brain-panel-container">
                            {selectedData ? (
                                <RegionInfoPanel
                                    region={selectedData}
                                    onClose={() => setSelectedRegion(null)}
                                    onStartQuiz={handleStartQuiz}
                                />
                            ) : (
                                <div className="brain-empty-panel system-window">
                                    <div className="brain-empty-icon">🧠</div>
                                    <h3>Select a Region</h3>
                                    <p>Click on any brain region to explore its anatomy, clinical correlations, and NEET SS high-yield facts.</p>
                                    <div className="brain-legend">
                                        {Object.entries(categoryLabels).map(([key, label]) => (
                                            <div key={key} className="brain-legend-item">
                                                <span className="brain-legend-dot" style={{
                                                    background: brainRegions.find((r) => r.category === key)?.color || '#888'
                                                }} />
                                                <span>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="brain-quiz-container">
                        <BrainQuiz
                            regionId={quizRegion}
                            onComplete={handleQuizComplete}
                            onExit={() => setMode('explore')}
                            onAnswer={handleQuizAnswer}
                            soundEnabled={soundEnabled}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
