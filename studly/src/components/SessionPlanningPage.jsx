import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Clock, Target, BookOpen, X, Home, Calendar, TrendingUp, User, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { sessionsAPI, subjectsAPI } from '../services/api';
import './SessionPlanningPage.css';

const SessionPlanningPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    goal: '',
    subjectId: '',
    workInterval: 25,
    shortBreak: 5,
    longBreak: 15,
    intervalsCount: 4,
    customIntervals: false
  });

  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const presetIntervals = [
    { work: 25, short: 5, long: 15, count: 4, label: 'Классический (25/5)' },
    { work: 30, short: 10, long: 20, count: 4, label: 'Удлиненный (30/10)' },
    { work: 45, short: 15, long: 30, count: 3, label: 'Глубокий фокус (45/15)' },
    { work: 15, short: 3, long: 10, count: 5, label: 'Быстрый (15/3)' }
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sess, subs] = await Promise.all([sessionsAPI.getAll(), subjectsAPI.getAll()]);
        setSessions(sess);
        setSubjects(subs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isActive = (path) => location.pathname === path;

  const handlePresetSelect = (preset) => {
    setFormData({
      ...formData,
      workInterval: preset.work,
      shortBreak: preset.short,
      longBreak: preset.long,
      intervalsCount: preset.count,
      customIntervals: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.goal || !formData.subjectId) return;
    try {
      const created = await sessionsAPI.create({
        goal: formData.goal,
        subject_id: parseInt(formData.subjectId) || null,
        work_interval: formData.workInterval,
        short_break: formData.shortBreak,
        long_break: formData.longBreak,
        intervals_count: formData.intervalsCount
      });
      setSessions([created, ...sessions]);
      setShowForm(false);
      setFormData({ goal: '', subjectId: '', workInterval: 25, shortBreak: 5, longBreak: 15, intervalsCount: 4, customIntervals: false });
    } catch (err) {
      showNotification(err.message || 'Ошибка создания сессии', 'error');
    }
  };

  const handleStartSession = (sessionId) => {
    navigate(`/pomodoro?session=${sessionId}`);
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
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

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelected = (day) => {
    if (!day) return false;
    return day === selectedDate.getDate() && 
           currentMonth.getMonth() === selectedDate.getMonth() && 
           currentMonth.getFullYear() === selectedDate.getFullYear();
  };

  const handleDateSelect = (day) => {
    if (day) {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setSelectedDate(newDate);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const handleScheduleSession = async () => {
    if (!formData.goal || !formData.subjectId) {
      showNotification('Пожалуйста, заполните цель и предмет сессии', 'error');
      return;
    }
    if (!selectedTime) {
      showNotification('Пожалуйста, выберите время', 'error');
      return;
    }
    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    try {
      const created = await sessionsAPI.create({
        goal: formData.goal,
        subject_id: parseInt(formData.subjectId) || null,
        work_interval: formData.workInterval,
        short_break: formData.shortBreak,
        long_break: formData.longBreak,
        intervals_count: formData.intervalsCount,
        scheduled_at: scheduledDateTime.toISOString()
      });
      setSessions([created, ...sessions]);
      showNotification(`Сессия запланирована на ${scheduledDateTime.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 'success');
      setShowScheduleModal(false);
      setShowForm(false);
      setSelectedTime('');
      setFormData({ goal: '', subjectId: '', workInterval: 25, shortBreak: 5, longBreak: 15, intervalsCount: 4, customIntervals: false });
    } catch (err) {
      showNotification(err.message || 'Ошибка', 'error');
    }
  };

  return (
    <div className={`session-planning-page ${isLoaded ? 'loaded' : ''}`}>
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

      <main className="session-planning-main">
        <header className="session-planning-header">
          <div>
            <h1 className="page-title">Планирование сессий</h1>
            <p className="page-subtitle">Создай эффективные Pomodoro-сессии</p>
          </div>
          <button 
            className="btn-new-session"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={18} />
            <span>Новая сессия</span>
          </button>
        </header>

        {showForm && (
          <div className="session-form-container">
            <div className="session-form-header">
              <h2>Создать Pomodoro-сессию</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="session-form">
              <div className="form-group">
                <label>Цель сессии</label>
                <input
                  type="text"
                  placeholder="Например: Изучить производные"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Предмет</label>
                <select
                  className="studly-select"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Интервалы</label>
                <div className="intervals-options">
                  <div className="preset-intervals">
                    {presetIntervals.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`preset-card ${
                          !formData.customIntervals && 
                          formData.workInterval === preset.work ? 'active' : ''
                        }`}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className="preset-label">{preset.label}</div>
                        <div className="preset-details">
                          {preset.work} мин / {preset.short} мин
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`custom-interval-btn ${formData.customIntervals ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, customIntervals: !formData.customIntervals })}
                  >
                    Свои интервалы
                  </button>
                </div>
              </div>

              {formData.customIntervals && (
                <div className="custom-intervals-form">
                  <div className="form-row">
                    <div className="form-group-small">
                      <label>Работа (мин)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={formData.workInterval}
                        onChange={(e) => setFormData({ ...formData, workInterval: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="form-group-small">
                      <label>Короткий перерыв (мин)</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.shortBreak}
                        onChange={(e) => setFormData({ ...formData, shortBreak: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="form-group-small">
                      <label>Длинный перерыв (мин)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={formData.longBreak}
                        onChange={(e) => setFormData({ ...formData, longBreak: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="form-group-small">
                      <label>Количество интервалов</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.intervalsCount}
                        onChange={(e) => setFormData({ ...formData, intervalsCount: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                  Отмена
                </button>
                <button 
                  type="button" 
                  className="btn-schedule"
                  onClick={() => {
                    if (!formData.goal || !formData.subjectId) {
                      showNotification('Пожалуйста, заполните цель и предмет сессии', 'error');
                      return;
                    }
                    setShowScheduleModal(true);
                  }}
                >
                  <Calendar size={18} />
                  <span>Запланировать</span>
                </button>
                <button type="submit" className="btn-create">
                  Создать сессию
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="sessions-list-container">
          <h2 className="section-title">Мои сессии</h2>
          {loading && <p>Загрузка...</p>}
          <div className="sessions-grid">
            {sessions.map(session => (
              <div key={session.id} className="session-card-sessions" style={{ '--accent': session.subject_color || '#7012CE' }}>
                <div className="session-card-accent" />
                <div className="session-card-body">
                  <div className="session-card-header">
                    <span className="session-subject-badge outline" style={{ color: session.subject_color || '#7012CE', borderColor: session.subject_color || '#7012CE' }}>
                      {session.subject_name || 'Общее'}
                    </span>
                    <span className="session-time-badge">
                      <Clock size={14} />
                      {session.duration_minutes} мин
                    </span>
                  </div>
                  <h3 className="session-goal">
                    <Target size={16} />
                    {session.goal}
                  </h3>
                  <div className="session-meta-row">
                    <span className="session-intervals">{session.work_interval}/{session.short_break} мин</span>
                    <span className="session-date">
                      {session.scheduled_at ? new Date(session.scheduled_at).toLocaleString('ru-RU') : (session.created_at ? new Date(session.created_at).toLocaleDateString('ru-RU') : '')}
                    </span>
                  </div>
                  {session.status !== 'completed' && (
                    <button
                      className="btn-start-session outline"
                      onClick={() => handleStartSession(session.id)}
                      style={{ borderColor: session.subject_color || '#7012CE', color: session.subject_color || '#7012CE' }}
                    >
                      <Play size={16} />
                      Начать сессию
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="schedule-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h2>Запланировать сессию</h2>
              <button className="btn-close-modal" onClick={() => setShowScheduleModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="schedule-modal-content">
              <div className="schedule-info-preview">
                <p><strong>Цель:</strong> {formData.goal || 'Не указана'}</p>
                <p><strong>Предмет:</strong> {subjects.find(s => s.id == formData.subjectId)?.name || 'Не выбран'}</p>
                <p><strong>Интервалы:</strong> {formData.workInterval} мин работа / {formData.shortBreak} мин перерыв</p>
                <p><strong>Количество интервалов:</strong> {formData.intervalsCount}</p>
              </div>

              <div className="calendar-section">
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
                  {weekDays.map((day) => (
                    <div key={day} className="calendar-day-header">{day}</div>
                  ))}
                  {getCalendarDays().map((day, idx) => (
                    <div 
                      key={idx} 
                      className={`calendar-day ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''}`}
                      onClick={() => handleDateSelect(day)}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              <div className="time-section">
                <label>Выберите время:</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="time-input"
                />
              </div>
            </div>

            <div className="schedule-modal-actions">
              <button className="btn-cancel-schedule" onClick={() => setShowScheduleModal(false)}>
                Отмена
              </button>
              <button className="btn-confirm-schedule" onClick={handleScheduleSession}>
                Запланировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            className="notification-close"
            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionPlanningPage;

