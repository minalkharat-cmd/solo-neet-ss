import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { subjects, questions, achievements, getXPForLevel, getRankFromLevel } from './data';
import { playCorrect, playWrong, playLevelUp, playAchievement, playClick, playTimerTick, playDungeonEnter, playVictory, playDefeat, playCritical } from './utils/sound';
import { DailyRewards } from './components/DailyRewards';
import { SpinWheel } from './components/SpinWheel';
import { MysteryBox } from './components/MysteryBox';
import { DungeonBreak } from './components/DungeonBreak';
import { Profile } from './components/Profile';
import { Dashboard } from './components/Dashboard';
import { Leaderboard } from './components/Leaderboard';
import { LoginGate } from './components/LoginGate';
import { PvPBattle } from './components/PvPBattle';
import { ReviewDashboard } from './components/ReviewDashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { StudyGroups } from './components/StudyGroups';
import { ChallengeModal } from './components/ChallengeModal';
import { NotificationBell } from './components/NotificationBell';
import { PremiumModal } from './components/PremiumModal';
import { setToken, getToken, getMe, saveProgress, logout } from './services/api';
import './index.css';

// ============================================
// COMPONENTS
// ============================================

// Settings Panel
function SettingsPanel({ soundEnabled, onToggleSound, onClose, onLogout, user }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [textSize, setTextSize] = useState(() => localStorage.getItem('textSize') || 'medium');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const cycleTextSize = () => {
    const sizes = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(textSize);
    const newSize = sizes[(currentIndex + 1) % sizes.length];
    setTextSize(newSize);
    localStorage.setItem('textSize', newSize);
    document.documentElement.setAttribute('data-text-size', newSize);
  };

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal system-window" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">⚙️ System Config</h2>
        <div className="settings-list">
          <div className="settings-item">
            <span>🔊 Aura Sounds</span>
            <button className={`toggle-btn ${soundEnabled ? 'active' : ''}`} onClick={onToggleSound}>
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-item">
            <span>🌓 Theme</span>
            <button className={`toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme}>
              {theme === 'dark' ? '🌙 DARK' : '☀️ LIGHT'}
            </button>
          </div>
          <div className="settings-item">
            <span>📝 Text Size</span>
            <button className="toggle-btn" onClick={cycleTextSize}>
              {textSize.toUpperCase()}
            </button>
          </div>
          {user && onLogout && (
            <div className="settings-item" style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <span>👤 {user.hunterName || user.username}</span>
              <button className="btn btn-secondary" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Achievement Notification
function AchievementNotification({ achievement, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="achievement-popup animate-slide-up">
      <div className="achievement-icon">{achievement.icon}</div>
      <div className="achievement-info">
        <div className="achievement-label">Achievement Unlocked!</div>
        <div className="achievement-name">{achievement.name}</div>
        <div className="achievement-xp">+{achievement.xp} XP</div>
      </div>
    </div>
  );
}

// Achievements Panel
function AchievementsPanel({ unlockedAchievements, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg system-window" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">🏆 Achievement Vault</h2>
        <div className="achievements-grid">
          {achievements.map((achievement) => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            return (
              <div key={achievement.id} className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-name">{achievement.name}</div>
                <div className="achievement-desc">{achievement.description}</div>
                <div className="achievement-xp">+{achievement.xp} XP</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Hunter Profile Card
function HunterProfile({ gameState, onShowAchievements, onShowProfile, getAccuracy }) {
  const rankInfo = getRankFromLevel(gameState.level);
  const xpForNext = getXPForLevel(gameState.level);
  const xpProgress = (gameState.xp / xpForNext) * 100;

  return (
    <div className="hunter-profile system-window">
      <div className="profile-header">
        <div className="rank-badge clickable" style={{ borderColor: rankInfo.color, color: rankInfo.color }} onClick={onShowProfile} title="View Profile">
          {rankInfo.rank}
        </div>
        <div className="profile-info">
          <h3 className="hunter-name">Hunter</h3>
          <p className="hunter-title">{rankInfo.name}</p>
        </div>
        <button className="btn-icon" onClick={onShowAchievements} title="Achievements">🏆</button>
      </div>

      <div className="level-section">
        <div className="level-info">
          <span className="level-label">LEVEL</span>
          <span className="level-value">{gameState.level}</span>
        </div>
        <div className="xp-container">
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: `${xpProgress}%` }} />
          </div>
          <span className="xp-text">{gameState.xp} / {xpForNext} XP</span>
        </div>
      </div>

      {gameState.xpMultiplier > 1 && (
        <div className="active-buff animate-pulse">
          ⚡ {gameState.xpMultiplier}x XP Active!
        </div>
      )}

      <div className="stats-row">
        <div className="stat">
          <span className="stat-value">{gameState.totalXP.toLocaleString()}</span>
          <span className="stat-label">Total XP</span>
        </div>
        <div className="stat">
          <span className="stat-value">{gameState.questionsAnswered}</span>
          <span className="stat-label">Questions</span>
        </div>
        <div className="stat">
          <span className="stat-value">{getAccuracy()}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
      </div>
    </div>
  );
}

// Daily Quests
function DailyQuests({ dailyQuests }) {
  const questsData = [
    { id: 'questions', label: 'Answer questions', current: dailyQuests.questionsCompleted, target: dailyQuests.questionsTarget },
    { id: 'dungeons', label: 'Complete dungeons', current: dailyQuests.dungeonsCompleted, target: dailyQuests.dungeonsTarget },
  ];

  return (
    <div className="daily-quests">
      <h3 className="quest-title">📋 DAILY QUESTS</h3>
      <div className="quest-list">
        {questsData.map((quest) => (
          <div key={quest.id} className={`quest-item ${quest.current >= quest.target ? 'completed' : ''}`}>
            <span className="quest-checkbox">{quest.current >= quest.target ? '✅' : '⬜'}</span>
            <span className="quest-text">{quest.label}</span>
            <span className="quest-progress">{Math.min(quest.current, quest.target)}/{quest.target}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Subject Gate Card
function SubjectGate({ subject, level, progress, onClick }) {
  const isLocked = level < subject.unlockLevel;

  return (
    <div className={`gate-card ${isLocked ? 'locked' : ''}`} style={{ '--gate-color': subject.color }} onClick={() => !isLocked && onClick(subject)}>
      <div className="gate-icon">{subject.icon}</div>
      <div className="gate-info">
        <h3 className="gate-name">{subject.name}</h3>
        <p className="gate-desc">{subject.description}</p>
      </div>
      <div className="gate-stats">
        {progress ? (
          <span className="gate-accuracy" style={{ color: subject.color }}>{progress}% Accuracy</span>
        ) : (
          <span className="gate-new">NEW</span>
        )}
      </div>
      {isLocked && (
        <div className="gate-lock">
          <span>🔒 Level {subject.unlockLevel}</span>
        </div>
      )}
    </div>
  );
}

// Quiz Battle Component
function QuizBattle({ subject, questions: battleQuestions, onAnswer, onComplete, onExit, soundEnabled }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef(null);

  const currentQuestion = battleQuestions[currentIndex];

  useEffect(() => {
    if (isComplete || isSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        if (prev <= 5 && soundEnabled) playTimerTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isSubmitted, isComplete, soundEnabled]);

  const handleTimeout = () => {
    setIsSubmitted(true);
    setHp((prev) => prev - 1);
    if (soundEnabled) playWrong();
  };

  const handleSelect = (index) => {
    if (isSubmitted) return;
    setSelectedAnswer(index);
    if (soundEnabled) playClick();
  };

  const handleSubmit = () => {
    if (selectedAnswer === null || isSubmitted) return;

    clearInterval(timerRef.current);
    setIsSubmitted(true);

    const isCorrect = selectedAnswer === currentQuestion.correct;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      const isCritical = Math.random() < 0.1;
      const xpGain = isCritical ? currentQuestion.xp * 3 : currentQuestion.xp;
      onAnswer(true, xpGain, subject.id);
      if (soundEnabled) {
        if (isCritical) playCritical();
        else playCorrect();
      }
    } else {
      setHp((prev) => prev - 1);
      onAnswer(false, 0, subject.id);
      if (soundEnabled) playWrong();
    }
  };

  const handleNext = () => {
    if (hp <= 0 || currentIndex >= battleQuestions.length - 1) {
      setIsComplete(true);
      onComplete(score + (selectedAnswer === currentQuestion.correct ? 1 : 0), battleQuestions.length);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setTimeLeft(30);
  };

  if (isComplete || hp <= 0) {
    return (
      <div className="dungeon-complete system-window">
        <h2>{hp > 0 ? '⚔️ Dungeon Cleared!' : '💀 Dungeon Failed'}</h2>
        <div className="complete-stats">
          <div className="complete-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}/{battleQuestions.length}</span>
          </div>
          <div className="complete-stat">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{Math.round((score / battleQuestions.length) * 100)}%</span>
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onExit}>Return to Gates</button>
      </div>
    );
  }

  return (
    <div className="quiz-battle">
      <div className="battle-header">
        <div className="battle-hp">
          {'❤️'.repeat(hp)}{'🖤'.repeat(3 - hp)}
        </div>
        <div className={`battle-timer ${timeLeft <= 5 ? 'timer-critical' : ''}`}>
          ⏱️ {timeLeft}s
        </div>
        <div className="battle-progress">
          Q {currentIndex + 1}/{battleQuestions.length}
        </div>
      </div>

      <div className="question-card system-window">
        <div className="question-meta">
          <span className={`difficulty-badge ${currentQuestion.difficulty}`}>
            {currentQuestion.difficulty.toUpperCase()}
          </span>
          <span className="xp-badge">+{currentQuestion.xp} XP</span>
        </div>
        <h3 className="question-text">{currentQuestion.question}</h3>
      </div>

      <div className="options-grid">
        {currentQuestion.options.map((option, index) => {
          let optionClass = 'option-btn';
          if (isSubmitted) {
            if (index === currentQuestion.correct) optionClass += ' correct';
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

      {isSubmitted && (
        <div className="explanation-box">
          <p>{currentQuestion.explanation}</p>
        </div>
      )}

      <div className="battle-actions">
        {!isSubmitted ? (
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={selectedAnswer === null}>
            Submit Answer
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={handleNext}>
            {currentIndex >= battleQuestions.length - 1 || hp <= 1 ? 'See Results' : 'Next Question'}
          </button>
        )}
        <button className="btn btn-secondary" onClick={onExit}>Exit Dungeon</button>
      </div>
    </div>
  );
}

// Level Up Modal
function LevelUpModal({ data, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="modal-overlay">
      <div className="level-up-modal animate-glow">
        <div className="level-up-icon">⬆️</div>
        <h2 className="level-up-title">LEVEL UP!</h2>
        <div className="level-up-level">Level {data.level}</div>
        <div className="level-up-rank" style={{ color: getRankFromLevel(data.level).color }}>
          {data.rank}-Rank: {data.rankName}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

function App() {
  const {
    gameState,
    addXP,
    recordAnswer,
    completeDungeon,
    consumeWheelSpin,
    consumeMysteryBox,
    addMysteryBoxes,
    setXPMultiplier,
    getAccuracy,
    getSubjectAccuracy,
    levelUpData,
    dismissLevelUp,
    pendingAchievements,
    dismissAchievement,
  } = useGameState();

  // Auth state
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!getToken() || localStorage.getItem('offlineMode') === 'true';
  });
  const [authChecked, setAuthChecked] = useState(false);

  // Check for OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userParam = params.get('user');
    const authFailed = params.get('auth');

    if (token && userParam) {
      // OAuth success
      setToken(token);
      const userData = JSON.parse(userParam);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authFailed === 'failed') {
      console.error('OAuth authentication failed');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (getToken()) {
      // Validate existing token
      getMe().then(data => {
        setUser(data.user);
        setIsAuthenticated(true);
      }).catch(() => {
        logout();
        setIsAuthenticated(false);
      });
    }
    setAuthChecked(true);
  }, []);

  // Sync progress to backend
  const syncProgressRef = useRef(null);
  useEffect(() => {
    if (!isAuthenticated || !user || localStorage.getItem('offlineMode') === 'true') return;

    // Debounce progress sync
    if (syncProgressRef.current) clearTimeout(syncProgressRef.current);
    syncProgressRef.current = setTimeout(() => {
      saveProgress({
        level: gameState.level,
        currentXP: gameState.xp,
        totalXP: gameState.totalXP,
        questionsAnswered: gameState.questionsAnswered,
        correctAnswers: gameState.correctAnswers,
        currentStreak: gameState.streak,
        bestStreak: gameState.bestStreak,
        dungeonsCleared: gameState.dungeonsCleared,
        perfectDungeons: gameState.perfectDungeons,
        unlockedAchievements: gameState.unlockedAchievements,
        subjectProgress: gameState.subjectProgress,
        wheelSpins: gameState.wheelSpins,
        mysteryBoxes: gameState.mysteryBoxes
      }).catch(err => console.warn('Progress sync failed:', err));
    }, 2000);

    return () => {
      if (syncProgressRef.current) clearTimeout(syncProgressRef.current);
    };
  }, [gameState, isAuthenticated, user]);

  const handleLoginSuccess = (userData) => {
    if (userData) {
      setUser(userData);
      localStorage.setItem('offlineMode', 'false');
    } else {
      // Offline mode
      localStorage.setItem('offlineMode', 'true');
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('user');
    localStorage.removeItem('offlineMode');
    setUser(null);
    setIsAuthenticated(false);
  };

  const [currentView, setCurrentView] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [battleQuestions, setBattleQuestions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPvP, setShowPvP] = useState(false);
  const [showReviewDashboard, setShowReviewDashboard] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showStudyGroups, setShowStudyGroups] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showDungeonBreak, setShowDungeonBreak] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastDailyRewardClaim, setLastDailyRewardClaim] = useState(() => {
    return localStorage.getItem('lastDailyRewardClaim') || '';
  });
  const [loginStreak, setLoginStreak] = useState(() => {
    return parseInt(localStorage.getItem('loginStreak') || '0');
  });

  // Random dungeon break trigger (10% chance after completing a dungeon)
  const triggerDungeonBreakChance = () => {
    if (Math.random() < 0.15) {
      setShowDungeonBreak(true);
    }
  };

  const handleEnterDungeon = (subject) => {
    const subjectQuestions = questions[subject.id] || [];
    const shuffled = [...subjectQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
    setBattleQuestions(shuffled);
    setSelectedSubject(subject);
    setCurrentView('battle');
    if (soundEnabled) playDungeonEnter();
  };

  const handleBattleAnswer = (isCorrect, xp, subjectId) => {
    recordAnswer(isCorrect, subjectId);
    if (xp > 0) addXP(xp, subjectId);
  };

  const handleBattleComplete = (score, total) => {
    completeDungeon();
    if (soundEnabled) {
      if (score >= total * 0.7) playVictory();
      else playDefeat();
    }
    // Chance for dungeon break after completing
    triggerDungeonBreakChance();
  };

  const handleExitDungeon = () => {
    setCurrentView('home');
    setSelectedSubject(null);
    setBattleQuestions([]);
  };

  // Daily reward claim
  const handleDailyRewardClaim = (reward) => {
    const today = new Date().toDateString();
    setLastDailyRewardClaim(today);
    localStorage.setItem('lastDailyRewardClaim', today);

    const newStreak = loginStreak + 1;
    setLoginStreak(newStreak);
    localStorage.setItem('loginStreak', newStreak.toString());

    if (reward.type === 'xp') {
      addXP(reward.amount);
    } else if (reward.type === 'box') {
      addMysteryBoxes(reward.amount);
    } else if (reward.type === 'spin') {
      // Add spins - would need to add this to gameState
    }

    if (soundEnabled) playAchievement();
  };

  // Spin wheel reward
  const handleSpinReward = (prize) => {
    consumeWheelSpin();
    if (prize.type === 'xp') {
      addXP(prize.amount);
    } else if (prize.type === 'box') {
      addMysteryBoxes(prize.amount);
    } else if (prize.type === 'multiplier') {
      setXPMultiplier(prize.amount, 300000); // 5 minutes
    }
    if (soundEnabled) playAchievement();
  };

  // Mystery box reward
  const handleMysteryBoxReward = (prize) => {
    consumeMysteryBox();
    if (prize.type === 'xp') {
      addXP(prize.amount);
    } else if (prize.type === 'multiplier') {
      setXPMultiplier(prize.amount, prize.duration);
    }
    if (soundEnabled) playAchievement();
  };

  // Dungeon break complete
  const handleDungeonBreakComplete = (won, xpReward) => {
    addXP(xpReward);
    if (won) {
      addMysteryBoxes(1);
    }
  };

  useEffect(() => {
    if (levelUpData && soundEnabled) {
      playLevelUp();
    }
  }, [levelUpData, soundEnabled]);

  useEffect(() => {
    if (pendingAchievements.length > 0 && soundEnabled) {
      playAchievement();
    }
  }, [pendingAchievements, soundEnabled]);

  // Show login gate if not authenticated
  if (!authChecked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="system-window" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Awakening the System...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginGate onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="hero">
        <h1 className="hero-title">SOLO NEET <span className="text-accent">SS</span></h1>
        <p className="hero-subtitle">"I alone... will master Super-Specialty"</p>
      </header>

      {/* Navigation */}
      <nav className="nav-bar">
        <div className="nav-left">
          {currentView !== 'home' && (
            <button className="btn btn-secondary" onClick={handleExitDungeon}>← Back</button>
          )}
          {currentView === 'home' && (
            <>
              <button className="btn-icon nav-btn" onClick={() => setShowLeaderboard(true)} title="Leaderboard">🏆</button>
              <button className="btn-icon nav-btn" onClick={() => setShowDashboard(true)} title="Dashboard">📊</button>
              <button className="btn-icon nav-btn" onClick={() => setShowPvP(true)} title="PvP Battles">⚔️</button>
              <button className="btn-icon nav-btn" onClick={() => setShowReviewDashboard(true)} title="Review AI Questions">📋</button>
              <button className="btn-icon nav-btn" onClick={() => setShowAnalytics(true)} title="Analytics Dashboard">📊</button>
              <button className="btn-icon nav-btn" onClick={() => setShowStudyGroups(true)} title="Study Groups">👥</button>
              <button className="btn-icon nav-btn" onClick={() => setShowChallenge(true)} title="Challenge Friend">⚔️</button>
              <NotificationBell />
            </>
          )}
        </div>
        <div className="nav-center">
          {currentView === 'home' && (
            <div className="quick-actions">
              <button className="action-btn daily" onClick={() => setShowDailyRewards(true)} title="Daily Rewards">
                🎁 <span className="action-label">Daily</span>
              </button>
              <button className="action-btn spin" onClick={() => setShowSpinWheel(true)} title="Spin Wheel">
                🎡 <span className="action-label">{gameState.wheelSpins}</span>
              </button>
              <button className="action-btn box" onClick={() => setShowMysteryBox(true)} title="Mystery Box">
                📦 <span className="action-label">{gameState.mysteryBoxes}</span>
              </button>
            </div>
          )}
        </div>
        <div className="nav-right">
          {!isPremium && (
            <button className="btn btn-accent upgrade-btn" onClick={() => setShowPremium(true)} title="Upgrade to Premium">
              👑 Upgrade
            </button>
          )}
          {isPremium && (
            <span className="premium-badge-nav" title="Premium Active">👑</span>
          )}
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content container">
        {currentView === 'home' && (
          <div className="dashboard-grid">
            <aside className="sidebar">
              <HunterProfile
                gameState={gameState}
                onShowAchievements={() => setShowAchievements(true)}
                onShowProfile={() => setShowProfile(true)}
                getAccuracy={getAccuracy}
              />
              <DailyQuests dailyQuests={gameState.dailyQuests} />
            </aside>

            <section className="dungeon-section">
              <h2 className="section-title">
                <span className="title-icon">🚪</span>
                Specialty Gates
              </h2>
              <div className="gates-grid">
                {subjects.map((subject) => (
                  <SubjectGate
                    key={subject.id}
                    subject={subject}
                    level={gameState.level}
                    progress={getSubjectAccuracy(subject.id)}
                    onClick={handleEnterDungeon}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {currentView === 'battle' && selectedSubject && (
          <QuizBattle
            subject={selectedSubject}
            questions={battleQuestions}
            onAnswer={handleBattleAnswer}
            onComplete={handleBattleComplete}
            onExit={handleExitDungeon}
            soundEnabled={soundEnabled}
          />
        )}
      </main>

      {/* Modals */}
      {showSettings && (
        <SettingsPanel
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAchievements && (
        <AchievementsPanel
          unlockedAchievements={gameState.unlockedAchievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {showDailyRewards && (
        <DailyRewards
          streak={loginStreak}
          lastClaim={lastDailyRewardClaim}
          onClaim={handleDailyRewardClaim}
          onClose={() => setShowDailyRewards(false)}
        />
      )}

      {showSpinWheel && (
        <SpinWheel
          spinsRemaining={gameState.wheelSpins}
          onSpin={handleSpinReward}
          onClose={() => setShowSpinWheel(false)}
        />
      )}

      {showMysteryBox && (
        <MysteryBox
          boxesRemaining={gameState.mysteryBoxes}
          onOpen={handleMysteryBoxReward}
          onClose={() => setShowMysteryBox(false)}
        />
      )}

      {showProfile && (
        <Profile
          gameState={gameState}
          getAccuracy={getAccuracy}
          getSubjectAccuracy={getSubjectAccuracy}
          subjects={subjects}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showDashboard && (
        <Dashboard
          gameState={gameState}
          getAccuracy={getAccuracy}
          getSubjectAccuracy={getSubjectAccuracy}
          subjects={subjects}
          achievements={achievements}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          gameState={gameState}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showPvP && (
        <PvPBattle
          user={user}
          gameState={gameState}
          onClose={() => setShowPvP(false)}
          soundEnabled={soundEnabled}
          addXP={addXP}
        />
      )}

      {showReviewDashboard && (
        <ReviewDashboard onClose={() => setShowReviewDashboard(false)} />
      )}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
      {showStudyGroups && (
        <StudyGroups onClose={() => setShowStudyGroups(false)} userId={user?.id} />
      )}
      {showChallenge && (
        <ChallengeModal onClose={() => setShowChallenge(false)} />
      )}

      {showDungeonBreak && (
        <DungeonBreak
          questions={questions}
          onComplete={handleDungeonBreakComplete}
          onClose={() => setShowDungeonBreak(false)}
          soundEnabled={soundEnabled}
        />
      )}

      {levelUpData && (
        <LevelUpModal data={levelUpData} onDismiss={dismissLevelUp} />
      )}

      {pendingAchievements.length > 0 && (
        <AchievementNotification
          achievement={pendingAchievements[0]}
          onDismiss={dismissAchievement}
        />
      )}

      {showPremium && (
        <PremiumModal
          user={user}
          onClose={() => setShowPremium(false)}
          onSuccess={() => setIsPremium(true)}
        />
      )}
    </div>
  );
}

export default App;
