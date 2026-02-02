import { useState, useEffect } from 'react';

// Review Dashboard for AI-Generated Questions
export function ReviewDashboard({ onClose }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected
    const [specialty, setSpecialty] = useState('all');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

    useEffect(() => {
        fetchQuestions();
    }, [filter, specialty]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (filter === 'pending') params.append('reviewed', 'false');
            if (filter === 'approved') params.append('reviewed', 'true');

            const response = await fetch(`${API_URL}/api/questions/generated?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            let filtered = data.questions || [];

            // Filter by specialty
            if (specialty !== 'all') {
                filtered = filtered.filter(q => q.specialty === specialty);
            }

            // Filter by approval status
            if (filter === 'approved') {
                filtered = filtered.filter(q => q.approved === true);
            } else if (filter === 'rejected') {
                filtered = filtered.filter(q => q.approved === false && q.reviewed === true);
            }

            setQuestions(filtered);

            // Calculate stats
            const all = data.questions || [];
            setStats({
                pending: all.filter(q => !q.reviewed).length,
                approved: all.filter(q => q.approved === true).length,
                rejected: all.filter(q => q.reviewed && !q.approved).length
            });
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        }
        setLoading(false);
    };

    const handleAction = async (id, approved) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/questions/generated/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ approved })
            });
            fetchQuestions();
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    const handleBulkAction = async (approved) => {
        for (const id of selectedIds) {
            await handleAction(id, approved);
        }
        setSelectedIds(new Set());
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map(q => q.id)));
        }
    };

    const specialties = [
        'all', 'cardiology', 'neurology', 'gastroenterology', 'nephrology',
        'pulmonology', 'oncology', 'endocrinology', 'rheumatology', 'hematology',
        'infectious', 'critical', 'neonatology', 'surgery', 'orthopedics',
        'neurosurgery', 'cardiothoracic', 'radiology', 'psychiatry', 'dermatology', 'emergency'
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal system-window" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh' }}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2 className="modal-title">📋 AI Question Review Dashboard</h2>

                {/* Stats Bar */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, padding: '15px', background: 'rgba(255,193,7,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>{stats.pending}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Pending Review</div>
                    </div>
                    <div style={{ flex: 1, padding: '15px', background: 'rgba(46,213,115,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{stats.approved}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Approved</div>
                    </div>
                    <div style={{ flex: 1, padding: '15px', background: 'rgba(255,71,87,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>{stats.rejected}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Rejected</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-primary)' }}
                    >
                        <option value="pending">⏳ Pending</option>
                        <option value="approved">✅ Approved</option>
                        <option value="rejected">❌ Rejected</option>
                    </select>

                    <select
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-primary)' }}
                    >
                        {specialties.map(s => (
                            <option key={s} value={s}>{s === 'all' ? '🏥 All Specialties' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                    </select>

                    {selectedIds.size > 0 && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success" onClick={() => handleBulkAction(true)} style={{ padding: '8px 16px' }}>
                                ✅ Approve ({selectedIds.size})
                            </button>
                            <button className="btn btn-danger" onClick={() => handleBulkAction(false)} style={{ padding: '8px 16px' }}>
                                ❌ Reject ({selectedIds.size})
                            </button>
                        </div>
                    )}
                </div>

                {/* Questions List */}
                <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                            Loading questions...
                        </div>
                    ) : questions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                            <p style={{ fontSize: '2rem' }}>📭</p>
                            <p>No questions in this category</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', padding: '8px', background: 'var(--color-bg-elevated)', borderRadius: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === questions.length}
                                        onChange={selectAll}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Select All ({questions.length})</span>
                                </label>
                            </div>

                            {questions.map(q => (
                                <div key={q.id} style={{
                                    padding: '15px',
                                    marginBottom: '10px',
                                    background: selectedIds.has(q.id) ? 'rgba(123,104,238,0.15)' : 'var(--color-bg-elevated)',
                                    border: selectedIds.has(q.id) ? '2px solid var(--color-primary)' : '1px solid rgba(123,104,238,0.2)',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(q.id)}
                                            onChange={() => toggleSelect(q.id)}
                                            style={{ width: '18px', height: '18px', marginTop: '4px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: 'var(--color-primary)',
                                                    color: '#fff',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600
                                                }}>
                                                    {q.specialty?.toUpperCase()}
                                                </span>
                                                <span style={{
                                                    background: q.difficulty === 'hard' ? 'var(--color-danger)' : q.difficulty === 'easy' ? 'var(--color-success)' : 'var(--color-accent)',
                                                    color: '#fff',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.7rem'
                                                }}>
                                                    {q.difficulty?.toUpperCase()} • {q.xp} XP
                                                </span>
                                                {q.source?.pmid && (
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                                        PMID: {q.source.pmid}
                                                    </span>
                                                )}
                                            </div>

                                            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                                                {q.question}
                                            </p>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                                                {q.options?.map((opt, i) => (
                                                    <div key={i} style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        background: i === q.correct ? 'rgba(46,213,115,0.2)' : 'rgba(0,0,0,0.2)',
                                                        border: i === q.correct ? '1px solid var(--color-success)' : 'none',
                                                        color: i === q.correct ? 'var(--color-success)' : 'var(--color-text-secondary)'
                                                    }}>
                                                        {String.fromCharCode(65 + i)}. {opt}
                                                    </div>
                                                ))}
                                            </div>

                                            {q.explanation && (
                                                <div style={{
                                                    padding: '8px',
                                                    background: 'rgba(0,212,255,0.1)',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--color-accent)'
                                                }}>
                                                    💡 {q.explanation}
                                                </div>
                                            )}
                                        </div>

                                        {filter === 'pending' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <button
                                                    className="btn btn-success"
                                                    onClick={() => handleAction(q.id, true)}
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => handleAction(q.id, false)}
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReviewDashboard;
