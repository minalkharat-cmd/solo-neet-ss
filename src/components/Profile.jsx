// Profile Component - Hunter Card with detailed stats
import { getRankFromLevel } from '../data';

export function Profile({ gameState, getAccuracy, getSubjectAccuracy, subjects, onClose }) {
    const rankInfo = getRankFromLevel(gameState.level);
    const initials = 'SS'; // Super-Specialty Hunter

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg system-window profile-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="hunter-card">
                    <div className="card-header">
                        <div className="hunter-avatar" style={{ borderColor: rankInfo.color }}>
                            <span className="hunter-initials" style={{ color: rankInfo.color }}>{initials}</span>
                            <div className="rank-badge-small" style={{ background: rankInfo.color }}>
                                {rankInfo.rank}
                            </div>
                        </div>
                        <div className="hunter-info">
                            <h2 className="hunter-nickname">Super-Specialist Hunter</h2>
                            <p className="hunter-title" style={{ color: rankInfo.color }}>{rankInfo.name}</p>
                            <div className="hunter-level">Level {gameState.level}</div>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">⚡</div>
                            <div className="stat-value">{gameState.totalXP.toLocaleString()}</div>
                            <div className="stat-label">Total XP</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📝</div>
                            <div className="stat-value">{gameState.questionsAnswered}</div>
                            <div className="stat-label">Questions</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{gameState.correctAnswers}</div>
                            <div className="stat-label">Correct</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🎯</div>
                            <div className="stat-value">{getAccuracy()}%</div>
                            <div className="stat-label">Accuracy</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🔥</div>
                            <div className="stat-value">{gameState.maxStreak}</div>
                            <div className="stat-label">Best Streak</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🏆</div>
                            <div className="stat-value">{gameState.unlockedAchievements.length}</div>
                            <div className="stat-label">Achievements</div>
                        </div>
                    </div>

                    <div className="specialty-progress">
                        <h3 className="section-title">📊 Specialty Progress</h3>
                        <div className="specialty-list">
                            {subjects.slice(0, 6).map((subject) => {
                                const accuracy = getSubjectAccuracy(subject.id);
                                const progress = gameState.subjectProgress[subject.id];
                                const answered = progress?.answered || 0;

                                return (
                                    <div key={subject.id} className="specialty-item">
                                        <div className="specialty-header">
                                            <span className="specialty-icon">{subject.icon}</span>
                                            <span className="specialty-name">{subject.name}</span>
                                            <span className="specialty-accuracy" style={{ color: subject.color }}>
                                                {accuracy}%
                                            </span>
                                        </div>
                                        <div className="specialty-bar">
                                            <div
                                                className="specialty-fill"
                                                style={{ width: `${accuracy}%`, background: subject.color }}
                                            />
                                        </div>
                                        <div className="specialty-count">{answered} answered</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
