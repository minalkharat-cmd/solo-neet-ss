import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const fetchAnalytics = async (token) => {
    const res = await fetch(`${API_BASE}/api/analytics/personal`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
};

// Pure CSS Bar Chart
const BarChart = ({ data, label, color = '#a855f7' }) => (
    <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#e2e8f0', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>{label}</h4>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', padding: '0 4px' }}>
            {data.map((item, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '4px' }}>{item.value}</span>
                    <div style={{
                        width: '100%',
                        maxWidth: '40px',
                        height: `${Math.max(4, (item.value / Math.max(...data.map(d => d.value), 1)) * 100)}%`,
                        background: `linear-gradient(180deg, ${color}, ${color}88)`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.6s ease',
                        minHeight: '4px'
                    }} />
                    <span style={{ fontSize: '0.55rem', color: '#64748b', marginTop: '4px' }}>{item.label}</span>
                </div>
            ))}
        </div>
    </div>
);

// Circular Progress Ring
const ProgressRing = ({ percent, label, color = '#10b981', size = 80 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={6} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                    fill="#e2e8f0" fontSize="14" fontWeight="700" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
                    {percent}%
                </text>
            </svg>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>{label}</span>
        </div>
    );
};

// Subject mastery card
const MasteryBadge = ({ subject, data }) => {
    const colors = {
        mastered: '#10b981',
        proficient: '#3b82f6',
        learning: '#f59e0b',
        beginner: '#64748b'
    };
    const color = colors[data.mastery] || '#64748b';
    const displayName = subject.charAt(0).toUpperCase() + subject.slice(1);

    return (
        <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: `1px solid ${color}33`,
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '120px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>{displayName}</span>
                <span style={{
                    fontSize: '0.6rem', padding: '2px 8px', borderRadius: '12px',
                    background: `${color}22`, color, fontWeight: 600, textTransform: 'uppercase'
                }}>{data.mastery}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>{data.answered} Q</span>
                <span style={{ color }}>{data.accuracy}%</span>
            </div>
            <div style={{ height: '4px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.accuracy}%`, background: color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
            </div>
        </div>
    );
};

// Stat card
const StatCard = ({ icon, label, value, sub, color = '#a855f7' }) => (
    <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '1px solid #334155',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    }}>
        <div style={{ fontSize: '1.5rem' }}>{icon}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{sub}</div>}
    </div>
);

export const AnalyticsDashboard = ({ onClose }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('soloNeetSS_token');
        if (!token) {
            setError('Please log in to view analytics');
            setLoading(false);
            return;
        }

        fetchAnalytics(token)
            .then(data => { setAnalytics(data); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ color: '#a855f7', fontSize: '1.2rem' }}>⚡ Loading Analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                <div>{error}</div>
            </div>
        );
    }

    const { overview, subjectMastery, srsStats, weeklyXP } = analytics;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            zIndex: 9999, overflowY: 'auto', padding: '1rem'
        }}>
            <div style={{
                maxWidth: '600px', margin: '0 auto',
                background: 'linear-gradient(180deg, #0f172a 0%, #1a0a2e 100%)',
                borderRadius: '20px', border: '1px solid #334155',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>📊 Hunter Analytics</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#e2d6ff' }}>Your performance breakdown</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                        width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                        fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Overview Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <StatCard icon="⚡" label="Total XP" value={overview.totalXP.toLocaleString()} sub={`Avg ${overview.avgDailyXP}/day`} />
                        <StatCard icon="🎯" label="Accuracy" value={`${overview.accuracy}%`} sub={`${overview.correctAnswers}/${overview.questionsAnswered}`} color="#10b981" />
                        <StatCard icon="🔥" label="Best Streak" value={overview.bestStreak} sub={`Current: ${overview.currentStreak}`} color="#f59e0b" />
                        <StatCard icon="🏰" label="Dungeons" value={overview.dungeonsCleared} sub={`${overview.perfectDungeons} perfect`} color="#3b82f6" />
                        <StatCard icon="🏆" label="Achievements" value={overview.achievementsUnlocked} color="#ec4899" />
                        <StatCard icon="📅" label="Days Active" value={overview.daysActive} sub={`Level ${overview.level}`} color="#06b6d4" />
                    </div>

                    {/* Weekly XP Chart */}
                    <div style={{ background: '#0f172a', borderRadius: '14px', padding: '16px', border: '1px solid #1e293b' }}>
                        <BarChart
                            data={weeklyXP.map(w => ({ label: `W${w.week}`, value: w.xp }))}
                            label="📈 Weekly XP Gained"
                            color="#a855f7"
                        />
                    </div>

                    {/* Accuracy Rings */}
                    <div style={{ background: '#0f172a', borderRadius: '14px', padding: '16px', border: '1px solid #1e293b' }}>
                        <h4 style={{ color: '#e2e8f0', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 600 }}>🧠 SRS Memory Strength</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <ProgressRing percent={srsStats.totalCards > 0 ? Math.round((srsStats.mastered / srsStats.totalCards) * 100) : 0} label="Mastered" color="#10b981" />
                            <ProgressRing percent={srsStats.totalCards > 0 ? Math.round((srsStats.learning / srsStats.totalCards) * 100) : 0} label="Learning" color="#3b82f6" />
                            <ProgressRing percent={srsStats.totalCards > 0 ? Math.round((srsStats.new / srsStats.totalCards) * 100) : 0} label="New" color="#f59e0b" />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: '#64748b' }}>
                            {srsStats.totalCards} total cards · Ease: {srsStats.avgEaseFactor}
                        </div>
                    </div>

                    {/* Subject Mastery Grid */}
                    <div>
                        <h4 style={{ color: '#e2e8f0', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 600 }}>🏥 Subject Mastery</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {Object.entries(subjectMastery)
                                .sort(([, a], [, b]) => b.answered - a.answered)
                                .map(([subject, data]) => (
                                    <MasteryBadge key={subject} subject={subject} data={data} />
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
