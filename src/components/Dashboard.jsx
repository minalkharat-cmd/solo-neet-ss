// Dashboard Component - Analytics hub with tabs
import { useState } from 'react';
import { getRankFromLevel } from '../data';

export function Dashboard({ gameState, getAccuracy, getSubjectAccuracy, subjects, achievements, onClose }) {
    const [activeTab, setActiveTab] = useState('overview');
    const rankInfo = getRankFromLevel(gameState.level);

    const tabs = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'subjects', label: '📚 Subjects' },
        { id: 'progress', label: '📈 Progress' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-xl system-window dashboard-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <h2 className="modal-title">📊 Hunter's Ledger</h2>

                <div className="dashboard-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="dashboard-content">
                    {activeTab === 'overview' && (
                        <div className="tab-overview">
                            <div className="overview-cards">
                                <div className="overview-card highlight">
                                    <div className="card-icon">🎯</div>
                                    <div className="card-value">{getAccuracy()}%</div>
                                    <div className="card-label">Overall Accuracy</div>
                                </div>
                                <div className="overview-card">
                                    <div className="card-icon">📝</div>
                                    <div className="card-value">{gameState.questionsAnswered}</div>
                                    <div className="card-label">Total Questions</div>
                                </div>
                                <div className="overview-card">
                                    <div className="card-icon">⚡</div>
                                    <div className="card-value">{gameState.totalXP.toLocaleString()}</div>
                                    <div className="card-label">Total XP Earned</div>
                                </div>
                                <div className="overview-card">
                                    <div className="card-icon">🔥</div>
                                    <div className="card-value">{gameState.maxStreak}</div>
                                    <div className="card-label">Best Streak</div>
                                </div>
                            </div>

                            <div className="insights-row">
                                <div className="insight-card strength">
                                    <h4>💪 Strengths</h4>
                                    <div className="insight-list">
                                        {subjects
                                            .map((s) => ({ ...s, accuracy: getSubjectAccuracy(s.id) }))
                                            .filter((s) => s.accuracy >= 70)
                                            .sort((a, b) => b.accuracy - a.accuracy)
                                            .slice(0, 3)
                                            .map((s) => (
                                                <div key={s.id} className="insight-item">
                                                    <span>{s.icon} {s.name}</span>
                                                    <span className="insight-value">{s.accuracy}%</span>
                                                </div>
                                            ))}
                                        {subjects.filter((s) => getSubjectAccuracy(s.id) >= 70).length === 0 && (
                                            <p className="no-data">Keep practicing to discover your strengths!</p>
                                        )}
                                    </div>
                                </div>

                                <div className="insight-card improve">
                                    <h4>📈 Areas to Improve</h4>
                                    <div className="insight-list">
                                        {subjects
                                            .map((s) => ({ ...s, accuracy: getSubjectAccuracy(s.id), answered: gameState.subjectProgress[s.id]?.answered || 0 }))
                                            .filter((s) => s.answered > 0 && s.accuracy < 60)
                                            .sort((a, b) => a.accuracy - b.accuracy)
                                            .slice(0, 3)
                                            .map((s) => (
                                                <div key={s.id} className="insight-item">
                                                    <span>{s.icon} {s.name}</span>
                                                    <span className="insight-value warning">{s.accuracy}%</span>
                                                </div>
                                            ))}
                                        {subjects.filter((s) => (gameState.subjectProgress[s.id]?.answered || 0) > 0 && getSubjectAccuracy(s.id) < 60).length === 0 && (
                                            <p className="no-data">Great work! No weak areas detected.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'subjects' && (
                        <div className="tab-subjects">
                            <div className="subjects-table">
                                {subjects.map((subject) => {
                                    const progress = gameState.subjectProgress[subject.id];
                                    const answered = progress?.answered || 0;
                                    const correct = progress?.correct || 0;
                                    const accuracy = getSubjectAccuracy(subject.id);
                                    const isLocked = gameState.level < subject.unlockLevel;

                                    return (
                                        <div key={subject.id} className={`subject-row ${isLocked ? 'locked' : ''}`}>
                                            <div className="subject-info">
                                                <span className="subject-icon">{subject.icon}</span>
                                                <span className="subject-name">{subject.name}</span>
                                                {isLocked && <span className="lock-badge">🔒 Lv.{subject.unlockLevel}</span>}
                                            </div>
                                            <div className="subject-stats">
                                                <div className="subject-bar-container">
                                                    <div className="subject-bar">
                                                        <div
                                                            className="subject-fill"
                                                            style={{ width: `${accuracy}%`, background: subject.color }}
                                                        />
                                                    </div>
                                                    <span className="accuracy-label">{accuracy}%</span>
                                                </div>
                                                <div className="subject-counts">
                                                    <span>{correct}/{answered} correct</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'progress' && (
                        <div className="tab-progress">
                            <div className="milestones-section">
                                <h3>🏆 Milestones</h3>
                                <div className="milestones-grid">
                                    {achievements.slice(0, 12).map((achievement) => {
                                        const isUnlocked = gameState.unlockedAchievements.includes(achievement.id);
                                        return (
                                            <div key={achievement.id} className={`milestone-card ${isUnlocked ? 'achieved' : ''}`}>
                                                <div className="milestone-icon">{achievement.icon}</div>
                                                <div className="milestone-name">{achievement.name}</div>
                                                <div className="milestone-status">
                                                    {isUnlocked ? '✅ Achieved' : '🔒 Locked'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rank-progress-section">
                                <h3>⚔️ Rank Progress</h3>
                                <div className="rank-timeline">
                                    {['E', 'D', 'C', 'B', 'A', 'S'].map((rank, index) => {
                                        const levels = [1, 11, 21, 41, 61, 81];
                                        const isAchieved = gameState.level >= levels[index];
                                        const isCurrent = rankInfo.rank === rank;

                                        return (
                                            <div key={rank} className={`rank-node ${isAchieved ? 'achieved' : ''} ${isCurrent ? 'current' : ''}`}>
                                                <div className="rank-marker">{rank}</div>
                                                <div className="rank-level">Lv.{levels[index]}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
