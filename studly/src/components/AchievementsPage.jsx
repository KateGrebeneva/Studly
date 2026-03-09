import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Trophy, Target, Award, Star, Flame, CheckCircle2, 
  Home, BookOpen, Calendar, TrendingUp, User, Plus,
  Clock, Zap, BookMarked, Sparkles
} from 'lucide-react';
import { achievementsAPI, goalsAPI } from '../services/api';
import './AchievementsPage.css';

const iconMap = { Zap, Flame, Clock, CheckCircle2, BookMarked, Trophy };

const AchievementsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [ach, gls] = await Promise.all([achievementsAPI.getAll(), goalsAPI.getAll()]);
        setAchievements((ach || []).map(a => ({
          ...a,
          date: a.unlocked_at ? a.unlocked_at.slice(0, 10) : null,
          icon: iconMap[a.icon_name] ? React.createElement(iconMap[a.icon_name], { size: 24 }) : <Trophy size={24} />
        })));
        setGoals((gls || []).map(g => ({ ...g, progress: g.current_value ?? 0, target: g.target_value ?? 1, completed: g.is_completed })));
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const isActive = (path) => location.pathname === path;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className={`achievements-page ${isLoaded ? 'loaded' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
            <Home size={20} />
            <span>Главная</span>
          </button>
          <button className={`nav-item ${isActive('/subjects') ? 'active' : ''}`} onClick={() => navigate('/subjects')}>
            <BookOpen size={20} />
            <span>Предметы</span>
          </button>
          <button className={`nav-item ${isActive('/sessions') ? 'active' : ''}`} onClick={() => navigate('/sessions')}>
            <Calendar size={20} />
            <span>Сессии</span>
          </button>
          <button className={`nav-item ${isActive('/statistics') ? 'active' : ''}`} onClick={() => navigate('/statistics')}>
            <TrendingUp size={20} />
            <span>Статистика</span>
          </button>
          <button className={`nav-item ${isActive('/achievements') ? 'active' : ''}`} onClick={() => navigate('/achievements')}>
            <Trophy size={20} />
            <span>Достижения</span>
          </button>
          <button className={`nav-item ${isActive('/ai-planner') ? 'active' : ''}`} onClick={() => navigate('/ai-planner')}>
            <Sparkles size={20} />
            <span>AI Планировщик</span>
          </button>
          <button className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={20} />
            <span>Профиль</span>
          </button>
        </nav>
      </aside>

      <main className="achievements-main">
        <header className="achievements-header">
          <div>
            <h1 className="page-title">Цели и достижения</h1>
            <p className="page-subtitle">Отслеживай свой прогресс и получай награды</p>
          </div>
          <div className="achievement-stats">
            <div className="stat-badge">
              <Trophy size={20} />
              <span>{unlockedCount}/{totalCount}</span>
            </div>
          </div>
        </header>

        {/* Goals Section */}
        <section className="goals-section">
          <div className="section-header">
            <h2 className="section-title">
              <Target size={20} />
              Активные цели
            </h2>
            <button className="btn-add-goal">
              <Plus size={18} />
              Новая цель
            </button>
          </div>
          <div className="goals-grid">
            {goals.map((goal) => (
              <div key={goal.id} className="goal-card" style={{ borderLeftColor: goal.color }}>
                <div className="goal-header">
                  <h3 className="goal-title">{goal.title}</h3>
                  <span className={`goal-type ${goal.type}`}>
                    {goal.type === 'daily' ? 'День' : goal.type === 'weekly' ? 'Неделя' : 'Месяц'}
                  </span>
                </div>
                <div className="goal-progress">
                  <div className="progress-info">
                    <span className="progress-value">{goal.progress}</span>
                    <span className="progress-separator">/</span>
                    <span className="progress-target">{goal.target}</span>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div 
                      className="progress-bar-fill"
                      style={{ 
                        width: `${Math.min((goal.progress / goal.target) * 100, 100)}%`,
                        background: goal.color
                      }}
                    />
                  </div>
                </div>
                {goal.completed && (
                  <div className="goal-completed">
                    <CheckCircle2 size={16} />
                    <span>Выполнено!</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Achievements Section */}
        <section className="achievements-section">
          <div className="section-header">
            <h2 className="section-title">
              <Award size={20} />
              Достижения
            </h2>
          </div>
          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id} 
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div 
                  className="achievement-icon"
                  style={{ 
                    background: achievement.unlocked ? achievement.color : '#e5e7eb',
                    color: achievement.unlocked ? 'white' : '#9ca3af'
                  }}
                >
                  {achievement.icon}
                </div>
                <div className="achievement-content">
                  <h3 className="achievement-title">{achievement.title}</h3>
                  <p className="achievement-description">{achievement.description}</p>
                  {!achievement.unlocked && (
                    <div className="achievement-progress">
                      <div className="progress-bar-wrapper">
                        <div 
                          className="progress-bar-fill"
                          style={{ 
                            width: `${achievement.progress}%`,
                            background: achievement.color
                          }}
                        />
                      </div>
                      <span className="progress-text">{achievement.progress}%</span>
                    </div>
                  )}
                  {achievement.unlocked && achievement.date && (
                    <div className="achievement-date">
                      Получено: {new Date(achievement.date).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>
                {achievement.unlocked && (
                  <div className="achievement-badge">
                    <Star size={20} fill="currentColor" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AchievementsPage;


