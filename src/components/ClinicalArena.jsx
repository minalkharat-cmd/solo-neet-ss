// Clinical Arena - MedGemma-Powered Clinical Reasoning Tutor
import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const STEPS = [
    { id: 'history', label: 'History', icon: '📋', description: 'Analyze the clinical presentation and identify key features' },
    { id: 'exam', label: 'Physical Exam', icon: '🩺', description: 'Interpret physical examination findings' },
    { id: 'differential', label: 'Differential Dx', icon: '🧠', description: 'Generate and rank your differential diagnosis' },
    { id: 'investigations', label: 'Investigations', icon: '🔬', description: 'Review labs and imaging, refine your diagnosis' },
    { id: 'diagnosis', label: 'Final Diagnosis', icon: '🎯', description: 'Commit to your final diagnosis with reasoning' },
];

const STEP_PROMPTS = {
    history: 'Based on the clinical presentation, what are the key features you identify? What conditions come to mind?',
    exam: 'What do the physical exam findings tell you? Which findings are most significant?',
    differential: 'List your top 3-4 differential diagnoses, ranked from most to least likely. Explain your reasoning.',
    investigations: 'How do the lab results and imaging findings change your differential? What do they confirm or rule out?',
    diagnosis: 'What is your final diagnosis? Explain how you arrived at this conclusion.',
};

const SPECIALTY_MAP = {
    cardiology: { name: 'Cardiology', icon: '❤️', color: '#FF4757' },
    neurology: { name: 'Neurology', icon: '🧠', color: '#7B68EE' },
    gastroenterology: { name: 'Gastroenterology', icon: '🫁', color: '#2ED573' },
    gastro: { name: 'Gastroenterology', icon: '🫁', color: '#2ED573' },
    nephrology: { name: 'Nephrology', icon: '🫘', color: '#00D4FF' },
    pulmonology: { name: 'Pulmonology', icon: '🫁', color: '#5B8DEE' },
    oncology: { name: 'Oncology', icon: '🎗️', color: '#FF6B81' },
    endocrinology: { name: 'Endocrinology', icon: '⚗️', color: '#FFA502' },
    infectious: { name: 'Infectious Diseases', icon: '🦠', color: '#26DE81' },
    critical: { name: 'Critical Care', icon: '🏥', color: '#FC5C65' },
    hematology: { name: 'Hematology', icon: '🩸', color: '#A855F7' },
    rheumatology: { name: 'Rheumatology', icon: '🦴', color: '#F59E0B' },
    neonatology: { name: 'Neonatology', icon: '👶', color: '#EC4899' },
};

function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('soloNeetSS_token');
    return fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });
}

// ============ CASE SELECTOR ============
function CaseSelector({ onSelectCase, onClose }) {
    const [cases, setCases] = useState([]);
    const [specialtyCounts, setSpecialtyCounts] = useState({});
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/api/arena/cases')
            .then(r => r.json())
            .then(data => {
                setCases(data.cases || []);
                setSpecialtyCounts(data.specialtyCounts || {});
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = selectedSpecialty
        ? cases.filter(c => c.specialty === selectedSpecialty)
        : cases;

    const specialties = Object.keys(specialtyCounts);

    if (loading) {
        return (
            <div className="arena-loading">
                <div className="arena-spinner"></div>
                <p>Loading clinical cases...</p>
            </div>
        );
    }

    return (
        <div className="case-selector">
            <div className="arena-header-bar">
                <h2 className="arena-section-title">Select a Clinical Case</h2>
                <button className="btn btn-secondary" onClick={onClose}>Back</button>
            </div>

            {/* Specialty Filter */}
            <div className="specialty-filters">
                <button
                    className={`specialty-chip ${!selectedSpecialty ? 'active' : ''}`}
                    onClick={() => setSelectedSpecialty(null)}
                >
                    All ({cases.length})
                </button>
                {specialties.map(s => {
                    const info = SPECIALTY_MAP[s] || { name: s, icon: '📚', color: '#7B68EE' };
                    return (
                        <button
                            key={s}
                            className={`specialty-chip ${selectedSpecialty === s ? 'active' : ''}`}
                            style={{ '--chip-color': info.color }}
                            onClick={() => setSelectedSpecialty(s)}
                        >
                            {info.icon} {info.name} ({specialtyCounts[s]})
                        </button>
                    );
                })}
            </div>

            {/* Case Cards */}
            <div className="case-cards-grid">
                {filtered.map(c => {
                    const info = SPECIALTY_MAP[c.specialty] || { name: c.specialty, icon: '📚', color: '#7B68EE' };
                    return (
                        <div
                            key={c.id}
                            className="case-card"
                            style={{ '--case-color': info.color }}
                            onClick={() => onSelectCase(c.id)}
                        >
                            <div className="case-card-header">
                                <span className="case-icon">{info.icon}</span>
                                <span className={`difficulty-badge ${c.difficulty}`}>{c.difficulty.toUpperCase()}</span>
                            </div>
                            <h3 className="case-title">{c.title}</h3>
                            <div className="case-card-footer">
                                <span className="case-specialty">{info.name}</span>
                                <span className="case-xp">+{c.xpReward?.excellent || 150} XP</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Random Case Button */}
            <button className="btn btn-primary btn-lg arena-random-btn" onClick={() => onSelectCase(null)}>
                🎲 Random Case
            </button>
        </div>
    );
}

// ============ REASONING PANEL (Socratic Dialogue) ============
function ReasoningPanel({ step, caseData, revealedData, onSubmit, conversation, isLoading }) {
    const [response, setResponse] = useState('');
    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);
    const { isListening, transcript, interimTranscript, isSupported, toggleListening, clearTranscript, error: voiceError } = useVoiceInput();

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    // Sync voice transcript to response
    useEffect(() => {
        if (transcript) {
            setResponse(prev => {
                const trimmed = prev.trim();
                return trimmed ? trimmed + ' ' + transcript.trim() : transcript.trim();
            });
            clearTranscript();
        }
    }, [transcript, clearTranscript]);

    const handleSubmit = () => {
        if (!response.trim() || isLoading) return;
        if (isListening) toggleListening(); // Stop recording on submit
        onSubmit(response.trim());
        setResponse('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const stepInfo = STEPS.find(s => s.id === step);

    return (
        <div className="reasoning-panel">
            {/* Step Header */}
            <div className="step-header">
                <span className="step-icon">{stepInfo?.icon}</span>
                <div>
                    <h3 className="step-title">{stepInfo?.label}</h3>
                    <p className="step-desc">{stepInfo?.description}</p>
                </div>
            </div>

            {/* Revealed Clinical Data */}
            {revealedData && (
                <div className="revealed-data">
                    {revealedData.presentation && (
                        <div className="data-section">
                            <h4>Clinical Presentation</h4>
                            <p>{revealedData.presentation}</p>
                        </div>
                    )}
                    {revealedData.vitals && (
                        <div className="data-section vitals-display">
                            <h4>Vitals</h4>
                            <p className="vitals-text">{revealedData.vitals}</p>
                        </div>
                    )}
                    {revealedData.physicalExam && (
                        <div className="data-section">
                            <h4>Physical Examination</h4>
                            <p>{revealedData.physicalExam}</p>
                        </div>
                    )}
                    {revealedData.labs && (
                        <div className="data-section labs-display">
                            <h4>Laboratory Results</h4>
                            <div className="labs-grid">
                                {Object.entries(revealedData.labs).map(([key, value]) => (
                                    <div key={key} className="lab-item">
                                        <span className="lab-name">{key}</span>
                                        <span className="lab-value">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {revealedData.imagingDescription && (
                        <div className="data-section">
                            <h4>Imaging ({revealedData.imagingModality})</h4>
                            <p>{revealedData.imagingDescription}</p>
                        </div>
                    )}
                    {revealedData.hint && (
                        <div className="data-section hint-display">
                            <h4>Clinical Hint</h4>
                            <p>{revealedData.hint}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Chat Conversation */}
            <div className="reasoning-chat">
                {/* Initial prompt */}
                <div className="chat-message tutor">
                    <div className="chat-avatar">AI</div>
                    <div className="chat-bubble tutor-bubble">
                        {STEP_PROMPTS[step]}
                    </div>
                </div>

                {conversation.filter(c => c.step === step).map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role === 'student' ? 'student' : 'tutor'}`}>
                        <div className="chat-avatar">{msg.role === 'student' ? 'You' : 'AI'}</div>
                        <div className={`chat-bubble ${msg.role}-bubble`}>
                            {msg.text}
                            {msg.quality && (
                                <span className={`quality-badge quality-${msg.quality}`}>
                                    {msg.quality === 'excellent' ? '★★★' : msg.quality === 'good' ? '★★' : msg.quality === 'fair' ? '★' : '○'}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-message tutor">
                        <div className="chat-avatar">AI</div>
                        <div className="chat-bubble tutor-bubble typing">
                            <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="reasoning-input">
                <div className="input-row">
                    <textarea
                        ref={textareaRef}
                        value={response + (interimTranscript ? ' ' + interimTranscript : '')}
                        onChange={(e) => setResponse(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? 'Listening... speak your reasoning' : `Your reasoning for ${stepInfo?.label}...`}
                        rows={3}
                        disabled={isLoading}
                    />
                    <div className="input-actions">
                        {isSupported && (
                            <button
                                className={`btn voice-btn ${isListening ? 'listening' : ''}`}
                                onClick={toggleListening}
                                title={isListening ? 'Stop recording' : 'Speak your reasoning (MedASR)'}
                                disabled={isLoading}
                            >
                                {isListening ? '⏹' : '🎤'}
                            </button>
                        )}
                        <button
                            className="btn btn-primary send-btn"
                            onClick={handleSubmit}
                            disabled={!response.trim() || isLoading}
                        >
                            Send
                        </button>
                    </div>
                </div>
                {isListening && (
                    <div className="voice-status">
                        <span className="voice-pulse"></span>
                        <span>Listening... speak your clinical reasoning</span>
                    </div>
                )}
                {voiceError && <div className="voice-error">{voiceError}</div>}
            </div>
        </div>
    );
}

// ============ SCORE CARD ============
function ScoreCard({ score, caseInfo, onXPClaimed, xpClaimed, onClose }) {
    const gradeColors = { A: '#2ED573', B: '#7B68EE', C: '#FFA502', D: '#FF6B81', F: '#FF4757' };

    return (
        <div className="score-card-overlay">
            <div className="score-card system-window">
                <h2 className="score-title">Case Complete!</h2>

                {/* Overall Grade */}
                <div className="grade-display" style={{ '--grade-color': gradeColors[score.overallGrade] || '#7B68EE' }}>
                    <div className="grade-letter">{score.overallGrade}</div>
                    <div className="grade-score">{score.overallScore}/100</div>
                </div>

                {/* Score Breakdown */}
                <div className="score-breakdown">
                    {Object.entries(score.scores || {}).map(([key, value]) => (
                        <div key={key} className="score-row">
                            <span className="score-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                            <div className="score-bar-container">
                                <div className="score-bar-fill" style={{ width: `${value}%`, background: value >= 75 ? '#2ED573' : value >= 50 ? '#FFA502' : '#FF4757' }}></div>
                            </div>
                            <span className="score-value">{value}</span>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="score-summary">
                    <p>{score.summary}</p>
                </div>

                {/* Strengths & Improvements */}
                <div className="score-feedback-grid">
                    <div className="feedback-col strengths">
                        <h4>Strengths</h4>
                        <ul>
                            {(score.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div className="feedback-col improvements">
                        <h4>Areas to Improve</h4>
                        <ul>
                            {(score.areasToImprove || []).map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                </div>

                {/* Diagnosis Reveal */}
                {caseInfo && (
                    <div className="diagnosis-reveal">
                        <h4>Correct Diagnosis</h4>
                        <p className="diagnosis-text">{caseInfo.diagnosis}</p>

                        <h4>Key Findings</h4>
                        <ul className="key-findings-list">
                            {(caseInfo.keyFindings || []).map((f, i) => <li key={i}>{f}</li>)}
                        </ul>

                        <h4>Teaching Points</h4>
                        <ul className="teaching-points-list">
                            {(caseInfo.teachingPoints || []).map((p, i) => <li key={i}>{p}</li>)}
                        </ul>

                        {caseInfo.references && (
                            <p className="case-reference">Reference: {caseInfo.references}</p>
                        )}
                    </div>
                )}

                {/* XP Claim */}
                <div className="xp-claim-section">
                    {!xpClaimed ? (
                        <button className="btn btn-primary btn-lg xp-claim-btn" onClick={() => onXPClaimed(score.xpAwarded)}>
                            Claim +{score.xpAwarded} XP
                        </button>
                    ) : (
                        <div className="xp-claimed-badge">+{score.xpAwarded} XP Claimed!</div>
                    )}
                </div>

                <button className="btn btn-secondary" onClick={onClose}>Return to Arena</button>
            </div>
        </div>
    );
}

// ============ ARENA STATS ============
function ArenaStats({ onClose }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithAuth('/api/arena/stats')
            .then(r => r.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="arena-loading"><div className="arena-spinner"></div></div>;
    if (!stats) return null;

    return (
        <div className="arena-stats-panel">
            <div className="arena-header-bar">
                <h2 className="arena-section-title">Your Arena Stats</h2>
                <button className="btn btn-secondary" onClick={onClose}>Back</button>
            </div>

            <div className="stats-overview-grid">
                <div className="stat-card">
                    <span className="stat-number">{stats.totalSessions}</span>
                    <span className="stat-label">Cases Solved</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">{stats.avgScore}</span>
                    <span className="stat-label">Avg Score</span>
                </div>
                <div className="stat-card">
                    <span className="stat-number">{stats.totalXP}</span>
                    <span className="stat-label">Total XP Earned</span>
                </div>
            </div>

            {/* Grade Distribution */}
            <div className="grade-distribution">
                <h3>Grade Distribution</h3>
                <div className="grade-bars">
                    {Object.entries(stats.gradeDistribution || {}).map(([grade, count]) => (
                        <div key={grade} className="grade-bar-item">
                            <span className="grade-label">{grade}</span>
                            <div className="grade-bar" style={{ width: `${stats.totalSessions > 0 ? (count / stats.totalSessions) * 100 : 0}%` }}></div>
                            <span className="grade-count">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* By Specialty */}
            {Object.keys(stats.bySpecialty || {}).length > 0 && (
                <div className="specialty-stats">
                    <h3>By Specialty</h3>
                    {Object.entries(stats.bySpecialty).map(([spec, data]) => {
                        const info = SPECIALTY_MAP[spec] || { name: spec, icon: '📚' };
                        return (
                            <div key={spec} className="specialty-stat-row">
                                <span>{info.icon} {info.name}</span>
                                <span>{data.sessions} cases</span>
                                <span>Avg: {data.avgScore}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============ MAIN CLINICAL ARENA ============
export function ClinicalArena({ onClose, addXP, gameState }) {
    const [view, setView] = useState('home'); // home, select, active, score, stats
    const [sessionId, setSessionId] = useState(null);
    const [caseData, setCaseData] = useState(null);
    const [currentStep, setCurrentStep] = useState('history');
    const [stepsCompleted, setStepsCompleted] = useState([]);
    const [revealedData, setRevealedData] = useState({});
    const [allRevealedData, setAllRevealedData] = useState({});
    const [conversation, setConversation] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [score, setScore] = useState(null);
    const [caseInfo, setCaseInfo] = useState(null);
    const [xpClaimed, setXpClaimed] = useState(false);
    const [aiStatus, setAiStatus] = useState(null);

    // Check AI status on mount
    useEffect(() => {
        fetchWithAuth('/api/arena/ai-status')
            .then(r => r.json())
            .then(data => setAiStatus(data))
            .catch(() => setAiStatus({ available: false }));
    }, []);

    // Start a case
    const handleStartCase = useCallback(async (caseId) => {
        setIsLoading(true);
        try {
            const res = await fetchWithAuth('/api/arena/start', {
                method: 'POST',
                body: JSON.stringify({ caseId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSessionId(data.sessionId);
            setCaseData(data.case);
            setCurrentStep('history');
            setStepsCompleted([]);
            setConversation([]);
            setRevealedData({ presentation: data.case.presentation });
            setAllRevealedData({ presentation: data.case.presentation });
            setView('active');
        } catch (error) {
            console.error('Failed to start case:', error);
        }
        setIsLoading(false);
    }, []);

    // Submit reasoning
    const handleSubmitReasoning = useCallback(async (response) => {
        setIsLoading(true);
        try {
            // Optimistically add student message
            setConversation(prev => [...prev, {
                role: 'student', text: response, step: currentStep, timestamp: new Date().toISOString()
            }]);

            const res = await fetchWithAuth('/api/arena/reason', {
                method: 'POST',
                body: JSON.stringify({ sessionId, response, step: currentStep })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Add AI response
            setConversation(prev => [...prev, {
                role: 'tutor',
                text: data.feedback,
                quality: data.quality,
                hint: data.hint,
                step: currentStep,
                timestamp: new Date().toISOString()
            }]);

            // Merge revealed data
            if (data.revealedData) {
                setRevealedData(data.revealedData);
                setAllRevealedData(prev => ({ ...prev, ...data.revealedData }));
            }
        } catch (error) {
            console.error('Reasoning error:', error);
            setConversation(prev => [...prev, {
                role: 'tutor',
                text: 'I had trouble processing that. Try rephrasing your response.',
                step: currentStep,
                timestamp: new Date().toISOString()
            }]);
        }
        setIsLoading(false);
    }, [sessionId, currentStep]);

    // Advance step
    const handleNextStep = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchWithAuth('/api/arena/next-step', {
                method: 'POST',
                body: JSON.stringify({ sessionId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setCurrentStep(data.currentStep);
            setStepsCompleted(data.stepsCompleted);
            if (data.revealedData) {
                setRevealedData(data.revealedData);
                setAllRevealedData(prev => ({ ...prev, ...data.revealedData }));
            }
        } catch (error) {
            console.error('Next step error:', error);
        }
        setIsLoading(false);
    }, [sessionId]);

    // Complete session
    const handleComplete = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchWithAuth('/api/arena/complete', {
                method: 'POST',
                body: JSON.stringify({ sessionId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setScore(data.score);
            setCaseInfo(data.case);
            setView('score');
        } catch (error) {
            console.error('Complete error:', error);
        }
        setIsLoading(false);
    }, [sessionId]);

    // Claim XP
    const handleClaimXP = useCallback((xpAmount) => {
        if (addXP) addXP(xpAmount);
        setXpClaimed(true);
    }, [addXP]);

    // Reset for new case
    const handleReturnToArena = useCallback(() => {
        setView('home');
        setSessionId(null);
        setCaseData(null);
        setScore(null);
        setCaseInfo(null);
        setXpClaimed(false);
        setConversation([]);
        setStepsCompleted([]);
    }, []);

    // ============ RENDER ============

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && view === 'home') onClose(); }}>
            <div className="modal modal-fullscreen clinical-arena">
                {/* Arena Header */}
                <div className="arena-top-bar">
                    <div className="arena-brand">
                        <span className="arena-icon">🏥</span>
                        <h1 className="arena-title">Clinical Arena</h1>
                        <span className="arena-subtitle">MedGemma-Powered Reasoning Tutor</span>
                    </div>
                    <div className="arena-status">
                        {aiStatus && (
                            <span className={`ai-status-dot ${aiStatus.available ? 'online' : 'offline'}`}>
                                {aiStatus.available ? `AI: ${aiStatus.model || 'Active'}` : 'AI: Offline (Rule-Based)'}
                            </span>
                        )}
                        {view !== 'active' && (
                            <button className="modal-close" onClick={onClose}>×</button>
                        )}
                    </div>
                </div>

                <div className="arena-content">
                    {/* HOME */}
                    {view === 'home' && (
                        <div className="arena-home">
                            <div className="arena-hero">
                                <h2>Think Like a Doctor</h2>
                                <p>Work through real clinical cases step-by-step. Analyze history, interpret findings, build differentials, and arrive at the diagnosis — guided by AI.</p>
                            </div>

                            <div className="arena-actions-grid">
                                <button className="arena-action-card" onClick={() => setView('select')}>
                                    <span className="action-icon-large">🚪</span>
                                    <h3>Enter the Arena</h3>
                                    <p>Choose a clinical case and start reasoning</p>
                                </button>
                                <button className="arena-action-card" onClick={() => handleStartCase(null)}>
                                    <span className="action-icon-large">🎲</span>
                                    <h3>Random Case</h3>
                                    <p>Get a surprise case from any specialty</p>
                                </button>
                                <button className="arena-action-card" onClick={() => setView('stats')}>
                                    <span className="action-icon-large">📊</span>
                                    <h3>My Stats</h3>
                                    <p>View your arena performance and progress</p>
                                </button>
                            </div>

                            <div className="arena-how-it-works">
                                <h3>How It Works</h3>
                                <div className="steps-preview">
                                    {STEPS.map((step, i) => (
                                        <div key={step.id} className="step-preview-card">
                                            <div className="step-number">{i + 1}</div>
                                            <span className="step-preview-icon">{step.icon}</span>
                                            <span className="step-preview-label">{step.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CASE SELECTOR */}
                    {view === 'select' && (
                        <CaseSelector
                            onSelectCase={handleStartCase}
                            onClose={() => setView('home')}
                        />
                    )}

                    {/* ACTIVE CASE */}
                    {view === 'active' && caseData && (
                        <div className="arena-active">
                            {/* Case Header */}
                            <div className="active-case-header">
                                <div className="case-info-bar">
                                    <span className={`difficulty-badge ${caseData.difficulty}`}>{caseData.difficulty?.toUpperCase()}</span>
                                    <h2 className="active-case-title">{caseData.title}</h2>
                                    <span className="case-specialty-tag">
                                        {SPECIALTY_MAP[caseData.specialty]?.icon} {SPECIALTY_MAP[caseData.specialty]?.name || caseData.specialty}
                                    </span>
                                </div>
                            </div>

                            {/* Step Progress Bar */}
                            <div className="step-progress-bar">
                                {STEPS.map((step, i) => {
                                    const isActive = step.id === currentStep;
                                    const isCompleted = stepsCompleted.includes(step.id);
                                    return (
                                        <div key={step.id} className={`step-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                            <div className="step-dot">
                                                {isCompleted ? '✓' : i + 1}
                                            </div>
                                            <span className="step-label-small">{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reasoning Panel */}
                            <ReasoningPanel
                                step={currentStep}
                                caseData={caseData}
                                revealedData={allRevealedData}
                                onSubmit={handleSubmitReasoning}
                                conversation={conversation}
                                isLoading={isLoading}
                            />

                            {/* Action Bar */}
                            <div className="arena-action-bar">
                                {currentStep !== 'diagnosis' ? (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleNextStep}
                                        disabled={isLoading || conversation.filter(c => c.step === currentStep && c.role === 'student').length === 0}
                                    >
                                        Next Step →
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleComplete}
                                        disabled={isLoading || conversation.filter(c => c.step === 'diagnosis' && c.role === 'student').length === 0}
                                    >
                                        Submit Final Diagnosis
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={() => {
                                    if (confirm('Are you sure you want to exit? Progress will be lost.')) {
                                        handleReturnToArena();
                                    }
                                }}>
                                    Exit Case
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SCORE */}
                    {view === 'score' && score && (
                        <ScoreCard
                            score={score}
                            caseInfo={caseInfo}
                            onXPClaimed={handleClaimXP}
                            xpClaimed={xpClaimed}
                            onClose={handleReturnToArena}
                        />
                    )}

                    {/* STATS */}
                    {view === 'stats' && (
                        <ArenaStats onClose={() => setView('home')} />
                    )}
                </div>
            </div>
        </div>
    );
}
