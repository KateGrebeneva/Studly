import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, Target, TrendingUp, Calendar, 
  Play, Plus, BarChart3, User, Search,
  ChevronRight, CheckCircle2, 
  Flame, Home, Timer, ChevronLeft, Trophy, Sparkles
} from 'lucide-react';
import { statsAPI, sessionsAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todayStats, setTodayStats] = useState({ timeStudied: 0, tasksCompleted: 0, sessionsCompleted: 0, streak: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studyChartData, setStudyChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const loadData = React.useCallback(async () => {
    if (location.pathname !== '/dashboard') return;
    try {
      const [dashboard, sessions, subjectsData, weekly] = await Promise.all([
        statsAPI.getDashboard(),
        sessionsAPI.getAll(),
        statsAPI.getSubjects(),
        statsAPI.getWeekly()
      ]);
      setTodayStats(dashboard);
      setRecentSessions((sessions || []).slice(0, 6));
      setSubjects((subjectsData || []).map((s, i) => ({
        id: s.id || i,
        name: s.name,
        color: s.color || '#7012CE',
        timeThisWeek: s.total_minutes || 0,
        tasksCompleted: 0,
        tasksTotal: 0
      })));
      const daysOrder = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const chartMap = {};
      daysOrder.forEach((d, i) => { chartMap[i] = { day: d, time: 0, tasks: 0 }; });
      (weekly || []).forEach(w => {
        const idx = daysOrder.indexOf(w.day);
        if (idx >= 0) chartMap[idx] = { day: w.day, time: w.time || 0, tasks: w.tasks || 0 };
      });
      const last7 = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const w = (weekly || []).find(x => x.date === dateStr);
        const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
        last7.push({ day: dayNames[d.getDay()], time: w ? w.time : 0, tasks: w ? w.tasks : 0 });
      }
      setStudyChartData(last7.length ? last7 : daysOrder.map(d => ({ day: d, time: 0, tasks: 0 })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/dashboard') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loadData, location.pathname]);

  const isActive = (path) => location.pathname === path;

  const getCurrentDate = () => {
    const now = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
    return now.toLocaleDateString('ru-RU', options);
  };

  const formatSessionDate = (scheduledAt, completedAt, status) => {
    if (!scheduledAt && !completedAt) return 'Не запланировано';
    const dt = scheduledAt || completedAt;
    if (!dt) return '';
    const d = new Date(dt);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayLabel = d.toDateString() === today.toDateString() ? 'Сегодня' : 
      d.toDateString() === tomorrow.toDateString() ? 'Завтра' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `${dayLabel}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const maxTime = Math.max(1, ...(studyChartData.map(d => d.time) || [0]));
  const maxTasks = Math.max(1, ...(studyChartData.map(d => d.tasks) || [0]));
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = 40;

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник = 0
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];


  return (
    <div className={`dashboard-page ${isLoaded ? 'loaded' : ''}`}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            <Home size={20} />
            <span>Главная</span>
          </button>
          <button 
            className={`nav-item ${isActive('/subjects') ? 'active' : ''}`}
            onClick={() => navigate('/subjects')}
          >
            <BookOpen size={20} />
            <span>Предметы</span>
          </button>
          <button 
            className={`nav-item ${isActive('/sessions') ? 'active' : ''}`}
            onClick={() => navigate('/sessions')}
          >
            <Calendar size={20} />
            <span>Сессии</span>
          </button>
          <button 
            className={`nav-item ${isActive('/statistics') ? 'active' : ''}`}
            onClick={() => navigate('/statistics')}
          >
            <TrendingUp size={20} />
            <span>Статистика</span>
          </button>
          <button 
            className={`nav-item ${isActive('/ai-planner') ? 'active' : ''}`}
            onClick={() => navigate('/ai-planner')}
          >
            <Sparkles size={20} />
            <span>AI Планировщик</span>
          </button>
          <button 
            className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <User size={20} />
            <span>Профиль</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="search-container-header">
            <Search size={18} />
            <input type="text" placeholder="Поиск..." className="search-input-header" />
          </div>
          <div className="date-display">
            {getCurrentDate()}
          </div>
        </header>

        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-content">
            <h2 className="welcome-title">Добро пожаловать!</h2>
            <p className="welcome-text">
              Продолжай свой путь к успеху! Сегодня ты уже изучил {Math.floor(todayStats.timeStudied / 60)}ч {todayStats.timeStudied % 60}мин
              и выполнил {todayStats.tasksCompleted} задач.
            </p>
            <div className="welcome-actions">
              <button className="btn-start-session" onClick={() => navigate('/sessions')}>
                <Plus size={18} />
                Новая сессия
              </button>
              <button className="btn-view-stats" onClick={() => navigate('/statistics')}>
                <TrendingUp size={18} />
                Статистика
              </button>
            </div>
          </div>
          <div className="welcome-illustration">
            <div className="book-stack">
              <div className="book book-1"></div>
              <div className="book book-2"></div>
              <div className="book book-3"></div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid stagger-children">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f8f5ff', color: '#7012CE' }}>
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Время сегодня</p>
              <p className="stat-value">{Math.floor(todayStats.timeStudied / 60)}ч {todayStats.timeStudied % 60}мин</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Задач выполнено</p>
              <p className="stat-value">{todayStats.tasksCompleted}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
              <Flame size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Серия дней</p>
              <p className="stat-value">{todayStats.streak} дней</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <Target size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Сессий сегодня</p>
              <p className="stat-value">{todayStats.sessionsCompleted}</p>
            </div>
          </div>
        </div>

        {/* Recent Sessions Section */}
        <section className="sessions-section">
          <div className="section-header">
            <h2 className="section-title">Недавние сессии</h2>
            <button className="btn-view-all" onClick={() => navigate('/sessions')}>
              Все <ChevronRight size={16} />
            </button>
          </div>
          <div className="sessions-grid">
            {recentSessions.map((session) => (
              <div key={session.id} className="session-card" style={{ borderTopColor: session.subject_color || '#7012CE' }}>
                <div className="session-card-header">
                  <div className="session-subject-badge outline" style={{ color: session.subject_color || '#7012CE', borderColor: session.subject_color || '#7012CE' }}>
                    {session.subject_name || 'Общее'}
                  </div>
                  {session.status === 'completed' ? (
                    <span className="status-badge completed">
                      <CheckCircle2 size={14} />
                      Завершено
                    </span>
                  ) : (
                    <span className="status-badge upcoming">
                      <Clock size={14} />
                      Запланировано
                    </span>
                  )}
                </div>
                <h3 className="session-goal">{session.goal}</h3>
                <div className="session-card-footer">
                  <div className="session-meta">
                    <div className="session-meta-item">
                      <Timer size={16} />
                      <span>{session.duration_minutes || 25} мин</span>
                    </div>
                    <div className="session-meta-item">
                      <Calendar size={16} />
                      <span>{session.date}</span>
                    </div>
                  </div>
                  {!session.completed && (
                    <button 
                      className="btn-start-session-item outline"
                      onClick={() => navigate(`/pomodoro?session=${session.id}`)}
                      style={{ borderColor: session.subject_color || '#7012CE', color: session.subject_color || '#7012CE' }}
                    >
                      <Play size={16} />
                      Начать
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* Chart and Calendar Section */}
        <section className="chart-calendar-section">
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">Динамика учебы</h2>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#7012CE' }}></div>
                  <span>Время (мин)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#4ecdc4' }}></div>
                  <span>Задачи</span>
                </div>
              </div>
            </div>
            <div className="chart-container">
              <svg width={chartWidth} height={chartHeight} className="study-chart">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = padding + (chartHeight - padding * 2) * (i / 4);
                  return (
                    <line
                      key={i}
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke="#f3f4f6"
                      strokeWidth="1"
                    />
                  );
                })}
                
                {/* Time line */}
                <polyline
                  points={studyChartData.map((data, index) => {
                    const x = padding + (index * (chartWidth - padding * 2) / Math.max(1, studyChartData.length - 1));
                    const y = chartHeight - padding - ((data.time / maxTime) * (chartHeight - padding * 2));
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#7012CE"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Tasks line */}
                <polyline
                  points={studyChartData.map((data, index) => {
                    const x = padding + (index * (chartWidth - padding * 2) / Math.max(1, studyChartData.length - 1));
                    const y = chartHeight - padding - ((data.tasks / maxTasks) * (chartHeight - padding * 2));
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#4ecdc4"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points and labels */}
                {studyChartData.map((data, index) => {
                  const x = padding + (index * (chartWidth - padding * 2) / (studyChartData.length - 1));
                  const y = chartHeight - padding - ((data.time / maxTime) * (chartHeight - padding * 2));
                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#7012CE"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={chartHeight - 10}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#6b7280"
                        fontWeight="500"
                      >
                        {data.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="calendar-card">
            <div className="calendar-header">
              <button 
                className="calendar-nav-btn"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="calendar-month">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button 
                className="calendar-nav-btn"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="calendar-grid">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                <div key={day} className="calendar-day-header">{day}</div>
              ))}
              {getCalendarDays().map((day, idx) => {
                const today = new Date();
                const isToday = day === today.getDate() && 
                               currentMonth.getMonth() === today.getMonth() && 
                               currentMonth.getFullYear() === today.getFullYear();
                const hasStudy = day && (day % 7 === 0 || day % 3 === 0); // Моковые данные для дней с занятиями
                return (
                  <div 
                    key={idx} 
                    className={`calendar-day ${isToday ? 'today' : ''} ${hasStudy ? 'has-study' : ''} ${!day ? 'empty' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
