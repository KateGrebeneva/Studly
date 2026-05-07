import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, BookOpen, Clock, Target, Home, User, Sparkles, Heart, Eye } from 'lucide-react';
import { statsAPI } from '../services/api';
import './StatisticsPage.css';

const StatisticsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [statsCards, setStatsCards] = useState({ streak: 0, totalHours: 0 });
  const [quote, setQuote] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboard, weekly, subjects, quoteData] = await Promise.all([
          statsAPI.getDashboard(),
          statsAPI.getWeekly(),
          statsAPI.getSubjects(),
          statsAPI.getQuote()
        ]);
        const totalMinutes = (weekly || []).reduce((s, w) => s + (w.time || 0), 0) || dashboard?.timeStudied || 0;
        setStatsCards({ 
          streak: dashboard?.streak || 0, 
          totalHours: Math.floor(totalMinutes / 60),
          tasksCompleted: dashboard?.tasksCompleted || 0
        });
        // Normalize weekly to last 7 days (even if API returns fewer rows).
        // Important: use local date key to avoid UTC shift from toISOString().
        const toLocalDateKey = (dt) => {
          const d = new Date(dt);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const weeklyMap = new Map(
          (weekly || []).map((w) => [toLocalDateKey(w.date), { time: Number(w.time || 0), tasks: Number(w.tasks || 0), day: w.day }])
        );

        const today = new Date();
        const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
        const weeklyNormalized = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = toLocalDateKey(d);
          const w = weeklyMap.get(dateStr);
          weeklyNormalized.push({
            day: dayNames[d.getDay()],
            time: w ? w.time : 0,
            tasks: w ? w.tasks : 0,
            date: dateStr,
          });
        }
        setWeeklyStats(weeklyNormalized);
        setSubjectStats(
          (subjects || [])
            .map((s) => ({ name: s.name, time: Number(s.total_minutes || 0), color: s.color }))
            .sort((a, b) => b.time - a.time)
        );
        setQuote(quoteData?.quote || null);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const isActive = (path) => location.pathname === path;
  const maxTime = Math.max(1, ...weeklyStats.map(d => d.time));
  const maxSubjectTime = Math.max(1, ...subjectStats.map(s => s.time));
  const mostStudiedSubject = subjectStats.length ? subjectStats[0].name : '—';
  const mostProductiveDay = weeklyStats.length
    ? weeklyStats.reduce((best, cur) => (cur.time > best.time ? cur : best), weeklyStats[0]).day
    : '—';

  const getCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
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
  
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const currentMonthDate = new Date();

  return (
    <div className={`statistics-page ${isLoaded ? 'loaded' : ''}`}>
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

      <main className="statistics-main">
        <header className="statistics-header">
          <div>
            <h1 className="page-title">Аналитика</h1>
            <p className="page-subtitle">Анализ учебы</p>
          </div>
          {quote && (
            <blockquote className="statistics-quote">
              <Sparkles size={18} />
              {quote}
            </blockquote>
          )}
        </header>

        <div className="stats-cards-grid">
          <div className="stat-card-small">
            <Heart size={24} />
            <div className="stat-card-content">
              <p className="stat-card-value">{statsCards.streak}</p>
              <p className="stat-card-label">дней подряд без пропусков</p>
            </div>
          </div>
          <div className="stat-card-small">
            <Eye size={24} />
            <div className="stat-card-content">
              <p className="stat-card-value">{statsCards.totalHours}</p>
              <p className="stat-card-label">часа прослушано всего</p>
            </div>
          </div>
          <div className="stat-card-small">
            <Target size={24} />
            <div className="stat-card-content">
              <p className="stat-card-value">{statsCards.tasksCompleted ?? 0}</p>
              <p className="stat-card-label">задач выполнено</p>
            </div>
          </div>
          <div className="stat-card-small">
            <TrendingUp size={24} />
            <div className="stat-card-content">
              <p className="stat-card-value">+15%</p>
              <p className="stat-card-label">прогресс за неделю</p>
            </div>
          </div>
        </div>

        <div className="stats-tabs-container">
          <div className="stats-tabs">
            <button 
              className={`stats-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              Календарь
            </button>
            <button 
              className={`stats-tab ${activeTab === 'statistics' ? 'active' : ''}`}
              onClick={() => setActiveTab('statistics')}
            >
              Статистика
            </button>
            <button 
              className={`stats-tab ${activeTab === 'subjects' ? 'active' : ''}`}
              onClick={() => setActiveTab('subjects')}
            >
              Предметы
            </button>
            <button 
              className={`stats-tab ${activeTab === 'growth' ? 'active' : ''}`}
              onClick={() => setActiveTab('growth')}
            >
              Рост
            </button>
          </div>

          <div className="stats-content">
            {activeTab === 'calendar' && (
              <div className="tab-content">
                <h2 className="tab-title">Календарь учебы</h2>
                <div className="calendar-widget">
                  <div className="calendar-month-header">
                    <span>{monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}</span>
                  </div>
                  <div className="calendar-grid-small">
                    {weekDays.map((day) => (
                      <div key={day} className="calendar-day-header-small">{day}</div>
                    ))}
                    {getCalendarDays().map((day, idx) => {
                      const isStudyDay = day && (day % 3 === 0 || day % 7 === 0);
                      return (
                        <div 
                          key={idx} 
                          className={`calendar-day-small ${!day ? 'empty' : ''} ${isStudyDay ? 'study-day' : 'rest-day'}`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  <div className="calendar-legend">
                    <div className="legend-item">
                      <div className="legend-dot study"></div>
                      <span>учебные дни</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot rest"></div>
                      <span>отдых</span>
                    </div>
                  </div>
                </div>
                <div className="month-summary-card">
                  <Calendar size={20} />
                  <div>
                    <p className="summary-label">Всего за {monthNames[currentMonthDate.getMonth() - 1]} {currentMonthDate.getFullYear()}</p>
                    <p className="summary-value">12.3 ч</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'statistics' && (
              <div className="tab-content">
                <h2 className="tab-title">Еженедельные часы обучения</h2>
                <div className="weekly-chart-container">
                  <div className="chart-y-axis">
                    <span>2h30m</span>
                    <span>2h0m</span>
                    <span>1h30m</span>
                    <span>1h0m</span>
                    <span>30m</span>
                    <span>0h0m</span>
                  </div>
                  <div className="weekly-chart-bars">
                    {weeklyStats.map((stat, index) => {
                      const ratio = maxTime ? (stat.time / maxTime) : 0;
                      const h = stat.time > 0 ? Math.max(8, ratio * 100) : 2;
                      return (
                        <div key={index} className="chart-bar-item">
                          <div className="chart-bar-track">
                            <div
                              className="chart-bar"
                              style={{ height: `${h}%` }}
                            >
                              <div className="chart-bar-dot"></div>
                            </div>
                          </div>
                          <div className="chart-day-label">{stat.day}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="most-productive-card">
                  <Clock size={20} />
                  <div>
                    <p className="productive-label">Самый продуктивный день</p>
                    <p className="productive-value">{mostProductiveDay}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="tab-content">
                <h2 className="tab-title">Изучения предметов</h2>
                <div className="subjects-chart-horizontal">
                  {subjectStats.map((subject, index) => (
                    <div key={index} className="subject-bar-item">
                      <span className="subject-name-small">{subject.name}</span>
                      <div className="subject-bar-container">
                        <div 
                          className="subject-bar"
                          style={{ width: `${(subject.time / maxSubjectTime) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="most-studied-card">
                  <BookOpen size={20} />
                  <div>
                    <p className="studied-label">Наиболее изучаемый предмет</p>
                    <p className="studied-value">{mostStudiedSubject}</p>
                    <p className="studied-message">Скоро вам будет подвластно все!</p>
                  </div>
                  <img src="/vedma.png" alt="Ведьма" className="vedma-image" />
                </div>
              </div>
            )}

            {activeTab === 'growth' && (
              <div className="tab-content">
                <h2 className="tab-title">Рост</h2>
                <div className="growth-card">
                  <p className="growth-title">Что-то волшебное ждет!</p>
                  <div className="cauldron-placeholder">
                    <img src="/kotel.png" alt="Котел" className="cauldron-image" />
                  </div>
                  <p className="growth-time">Время роста(учебы): 4 ч 34 мин</p>
                </div>
                <div className="growth-next-card">
                  <BookOpen size={20} />
                  <div>
                    <p className="growth-next-label">Через:</p>
                    <p className="growth-next-value">3 ч 26 мин</p>
                    <p className="growth-next-message">зелье перейдет на следующий этап!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;

