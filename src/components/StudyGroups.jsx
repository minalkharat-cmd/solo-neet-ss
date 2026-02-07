import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const fetchWithAuth = async (endpoint, options = {}) => {
    const token = localStorage.getItem('soloNeetSS_token');
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
        credentials: 'include'
    });
    return res;
};

const GroupCard = ({ group, userId, onJoin, onLeave }) => {
    const isMember = group.members.some(m => m.id === userId);
    const isOwner = group.ownerId === userId;

    return (
        <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: `1px solid ${isMember ? '#7c3aed44' : '#33415544'}`,
            borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0', fontWeight: 700 }}>{group.name}</h3>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#7c3aed22', color: '#a855f7' }}>
                    {group.members.length}/{group.maxMembers}
                </span>
            </div>
            {group.description && <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{group.description}</p>}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {group.members.slice(0, 5).map(m => (
                    <span key={m.id} style={{
                        fontSize: '0.65rem', padding: '2px 6px', borderRadius: '8px',
                        background: m.id === userId ? '#7c3aed33' : '#1e293b', color: '#94a3b8'
                    }}>{m.hunterName}</span>
                ))}
                {group.members.length > 5 && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>+{group.members.length - 5}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {isMember ? (
                    !isOwner && <button onClick={() => onLeave(group.id)} style={btnStyle('#ef4444')}>Leave</button>
                ) : (
                    group.members.length < group.maxMembers && <button onClick={() => onJoin(group.id)} style={btnStyle('#7c3aed')}>Join</button>
                )}
                {isOwner && <span style={{ fontSize: '0.65rem', color: '#f59e0b', alignSelf: 'center' }}>👑 Owner</span>}
            </div>
        </div>
    );
};

const btnStyle = (color) => ({
    padding: '6px 16px', border: 'none', borderRadius: '8px',
    background: color, color: '#fff', cursor: 'pointer',
    fontSize: '0.75rem', fontWeight: 600
});

export const StudyGroups = ({ onClose, userId }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const loadGroups = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/groups');
            if (res.ok) setGroups(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    const createGroup = async () => {
        if (!name.trim()) return;
        const res = await fetchWithAuth('/api/groups', { method: 'POST', body: JSON.stringify({ name, description }) });
        if (res.ok) { setShowCreate(false); setName(''); setDescription(''); loadGroups(); }
    };

    const joinGroup = async (id) => {
        await fetchWithAuth(`/api/groups/${id}/join`, { method: 'POST' });
        loadGroups();
    };

    const leaveGroup = async (id) => {
        await fetchWithAuth(`/api/groups/${id}/leave`, { method: 'POST' });
        loadGroups();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            zIndex: 9999, overflowY: 'auto', padding: '1rem'
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', background: 'linear-gradient(180deg, #0f172a, #1a0a2e)', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>👥 Study Groups</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#e2d6ff' }}>Join forces with fellow hunters</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button onClick={() => setShowCreate(!showCreate)} style={{ ...btnStyle('#7c3aed'), width: '100%', padding: '12px' }}>
                        {showCreate ? '✕ Cancel' : '➕ Create New Group'}
                    </button>

                    {showCreate && (
                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #334155' }}>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name..."
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '0.85rem' }} />
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)..."
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '0.85rem' }} />
                            <button onClick={createGroup} style={btnStyle('#10b981')}>Create Group</button>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#a855f7', padding: '2rem' }}>Loading groups...</div>
                    ) : groups.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No groups yet. Create the first one!</div>
                    ) : (
                        groups.map(g => <GroupCard key={g.id} group={g} userId={userId} onJoin={joinGroup} onLeave={leaveGroup} />)
                    )}
                </div>
            </div>
        </div>
    );
};
