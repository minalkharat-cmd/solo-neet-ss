import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export const ChallengeModal = ({ onClose, onStartChallenge }) => {
    const [mode, setMode] = useState('menu'); // menu | create | join
    const [challengeCode, setChallengeCode] = useState('');
    const [createdCode, setCreatedCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [subject, setSubject] = useState('cardiology');

    const subjects = [
        { id: 'cardiology', name: 'Cardiology', icon: '❤️' },
        { id: 'neurology', name: 'Neurology', icon: '🧠' },
        { id: 'gastro', name: 'Gastroenterology', icon: '🫁' },
        { id: 'nephrology', name: 'Nephrology', icon: '🫘' },
        { id: 'pulmonology', name: 'Pulmonology', icon: '🌬️' },
        { id: 'oncology', name: 'Oncology', icon: '🎗️' },
    ];

    const createChallenge = async () => {
        try {
            const token = localStorage.getItem('soloNeetSS_token');
            const res = await fetch(`${API_BASE}/api/challenge/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ subject, questionCount: 10 })
            });
            if (!res.ok) throw new Error('Failed to create challenge');
            const data = await res.json();
            setCreatedCode(data.code);
            setMode('created');
        } catch (e) { setError(e.message); }
    };

    const joinChallenge = async () => {
        if (!challengeCode.trim()) return;
        try {
            const token = localStorage.getItem('soloNeetSS_token');
            const res = await fetch(`${API_BASE}/api/challenge/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ code: challengeCode.trim().toUpperCase() })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Invalid code'); }
            const data = await res.json();
            if (onStartChallenge) onStartChallenge(data);
            onClose();
        } catch (e) { setError(e.message); }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const inputStyle = {
        padding: '12px', borderRadius: '10px', border: '1px solid #334155',
        background: '#1e293b', color: '#e2e8f0', fontSize: '1rem',
        textAlign: 'center', letterSpacing: '4px', fontWeight: 700
    };

    const btnPrimary = {
        padding: '12px 24px', border: 'none', borderRadius: '10px',
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
        cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, width: '100%'
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                maxWidth: '400px', width: '100%',
                background: 'linear-gradient(180deg, #0f172a, #1a0a2e)',
                borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden'
            }}>
                <div style={{ background: 'linear-gradient(135deg, #dc2626, #f87171)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>⚔️ Friend Challenge</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#fecaca' }}>Challenge your study partner!</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {error && <div style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center', background: '#7f1d1d33', padding: '8px', borderRadius: '8px' }}>{error}</div>}

                    {mode === 'menu' && (
                        <>
                            <button onClick={() => { setMode('create'); setError(''); }} style={btnPrimary}>🎯 Create Challenge</button>
                            <button onClick={() => { setMode('join'); setError(''); }} style={{ ...btnPrimary, background: 'linear-gradient(135deg, #059669, #10b981)' }}>🔗 Join with Code</button>
                        </>
                    )}

                    {mode === 'create' && (
                        <>
                            <h4 style={{ color: '#e2e8f0', margin: 0, fontSize: '0.85rem' }}>Choose Subject</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {subjects.map(s => (
                                    <button key={s.id} onClick={() => setSubject(s.id)} style={{
                                        padding: '8px 4px', borderRadius: '8px', border: subject === s.id ? '2px solid #7c3aed' : '1px solid #334155',
                                        background: subject === s.id ? '#7c3aed22' : '#1e293b', color: '#e2e8f0',
                                        cursor: 'pointer', fontSize: '0.7rem', textAlign: 'center'
                                    }}>{s.icon} {s.name}</button>
                                ))}
                            </div>
                            <button onClick={createChallenge} style={btnPrimary}>Generate Challenge Code</button>
                            <button onClick={() => setMode('menu')} style={{ ...btnPrimary, background: '#334155' }}>← Back</button>
                        </>
                    )}

                    {mode === 'created' && (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Share this code with your friend:</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7', letterSpacing: '6px', fontFamily: 'monospace' }}>{createdCode}</div>
                            <button onClick={copyCode} style={{ ...btnPrimary, background: copied ? '#10b981' : 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                                {copied ? '✅ Copied!' : '📋 Copy Code'}
                            </button>
                            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>Waiting for opponent to join... The challenge starts when they enter this code.</p>
                        </div>
                    )}

                    {mode === 'join' && (
                        <>
                            <h4 style={{ color: '#e2e8f0', margin: 0, fontSize: '0.85rem' }}>Enter Challenge Code</h4>
                            <input value={challengeCode} onChange={e => setChallengeCode(e.target.value.toUpperCase())}
                                placeholder="ABCD12" maxLength={6} style={inputStyle} />
                            <button onClick={joinChallenge} style={btnPrimary}>Join Challenge</button>
                            <button onClick={() => setMode('menu')} style={{ ...btnPrimary, background: '#334155' }}>← Back</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
