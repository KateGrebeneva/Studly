import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Plus, User, TrendingUp, Calendar, LogOut, ChevronRight, X, Play, Clock, CheckCircle2, Flame, Target } from 'lucide-react';
import { parentAPI, authAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import './ParentCabinetPage.css';

const ParentCabinetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [children, setChildren] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [childStats, setChildStats] = useState(null);
  const [childSessions, setChildSessions] = useState([]);
  const [childWeekly, setChildWeekly] = useState([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    goal: '',
    subject_id: '',
    work_interval: 25,
    intervals_count: 4
  });
  const [childSubjects, setChildSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unlinkModal, setUnlinkModal] = useState({ open: false, child: null });

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const list = await parentAPI.getChildren();
      setChildren(list || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChild = async (e) => {
    e.preventDefault();
    setError('');
    if (!inviteCode.trim()) return;
    try {
      await parentAPI.linkChild(inviteCode.trim().toUpperCase());
      setInviteCode('');
      setShowAddModal(false);
      loadChildren();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUnlinkClick = (child, e) => {
    e?.stopPropagation?.();
    setUnlinkModal({ open: true, child });
  };

  const handleUnlinkConfirm = async () => {
    if (!unlinkModal.child) return;
    try {
      await parentAPI.unlinkChild(unlinkModal.child.id);
      loadChildren();
      if (selectedChild?.id === unlinkModal.child.id) setSelectedChild(null);
      setUnlinkModal({ open: false, child: null });
    } catch (e) {
      setError(e.message);
    }
  };

  const loadChildData = async (child) => {
    setSelectedChild(child);
    setError('');
    try {
      const [stats, sessions, subjects, weekly] = await Promise.all([
        parentAPI.getChildStats(child.id),
        parentAPI.getChildSessions(child.id),
        parentAPI.getChildSubjects(child.id),
        parentAPI.getChildWeekly(child.id)
      ]);
      setChildStats(stats);
      setChildSessions(sessions || []);
      setChildSubjects(subjects || []);
      const daysOrder = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
      const today = new Date();
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const w = (weekly || []).find(x => x.date === dateStr);
        chartData.push({
          day: daysOrder[d.getDay()],
          time: w ? w.time : 0,
          tasks: w ? w.tasks : 0
        });
      }
      setChildWeekly(chartData);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.goal || !selectedChild) return;
    try {
      await parentAPI.createSessionForChild(selectedChild.id, {
        goal: sessionForm.goal,
        subject_id: sessionForm.subject_id ? parseInt(sessionForm.subject_id) : null,
        work_interval: sessionForm.work_interval,
        short_break: 5,
        long_break: 15,
        intervals_count: sessionForm.intervals_count
      });
      setShowSessionModal(false);
      setSessionForm({ goal: '', subject_id: '', work_interval: 25, intervals_count: 4 });
      loadChildData(selectedChild);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="parent-cabinet-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${isActive('/parent') ? 'active' : ''}`} onClick={() => navigate('/parent')}>
            <Users size={20} />
            <span>Мои дети</span>
          </button>
          <button className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={20} />
            <span>Профиль</span>
          </button>
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Выйти</span>
          </button>
        </nav>
      </aside>

      <main className="parent-main">
        <header className="parent-header">
          <h1>Личный кабинет родителя</h1>
          <button className="btn-add-child" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Добавить ребёнка
          </button>
        </header>

        {error && <div className="parent-error">{error}</div>}

        <div className="parent-content">
          <div className="children-list">
            <h2>Привязанные дети</h2>
            {loading ? (
              <p>Загрузка...</p>
            ) : children.length === 0 ? (
              <p className="empty-state">Пока нет привязанных детей. Добавьте ребёнка по коду из его профиля.</p>
            ) : (
              <div className="children-cards">
                {children.map((c) => (
                  <div
                    key={c.id}
                    className={`child-card ${selectedChild?.id === c.id ? 'selected' : ''}`}
                    onClick={() => loadChildData(c)}
                  >
                    <div className="child-avatar">{c.name?.charAt(0) || '?'}</div>
                    <div className="child-info">
                      <h3>{c.name}</h3>
                      <p>{c.email}</p>
                    </div>
                    <ChevronRight size={20} />
                    <button className="btn-unlink" onClick={(e) => handleUnlinkClick(c, e)} title="Отвязать">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedChild && (
            <div className="child-detail">
              <h2>{selectedChild.name}</h2>
              {childStats && (
                <div className="child-stats-cards stagger-children">
                  <div className="child-stat-card">
                    <div className="child-stat-icon" style={{ background: '#f8f5ff', color: '#7012CE' }}>
                      <Clock size={20} />
                    </div>
                    <div className="child-stat-content">
                      <p className="child-stat-value">{Math.floor(childStats.timeStudied / 60)}ч {childStats.timeStudied % 60}мин</p>
                      <p className="child-stat-label">Время сегодня</p>
                    </div>
                  </div>
                  <div className="child-stat-card">
                    <div className="child-stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="child-stat-content">
                      <p className="child-stat-value">{childStats.tasksCompleted}</p>
                      <p className="child-stat-label">Задач выполнено</p>
                    </div>
                  </div>
                  <div className="child-stat-card">
                    <div className="child-stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
                      <Flame size={20} />
                    </div>
                    <div className="child-stat-content">
                      <p className="child-stat-value">{childStats.streak} дней</p>
                      <p className="child-stat-label">Серия</p>
                    </div>
                  </div>
                  <div className="child-stat-card">
                    <div className="child-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                      <Target size={20} />
                    </div>
                    <div className="child-stat-content">
                      <p className="child-stat-value">{childStats.sessionsCompleted}</p>
                      <p className="child-stat-label">Сессий сегодня</p>
                    </div>
                  </div>
                </div>
              )}
              {childWeekly.length > 0 && (
                <div className="child-chart-section">
                  <h3>Динамика учёбы за неделю</h3>
                  <div className="child-chart-bars">
                    {childWeekly.map((d, i) => (
                      <div key={i} className="child-chart-bar">
                        <div
                          className="child-chart-fill"
                          style={{ height: `${Math.min(100, (d.time || 0) / 3)}%` }}
                        />
                        <span className="child-chart-day">{d.day}</span>
                        <span className="child-chart-value">{d.time || 0} мин</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="child-actions">
                <button className="btn-create-session" onClick={() => setShowSessionModal(true)}>
                  <Plus size={18} />
                  Создать сессию
                </button>
              </div>
              <div className="child-sessions">
                <h3>Последние сессии</h3>
                {(childSessions || []).slice(0, 5).map((s) => (
                  <div key={s.id} className="session-row">
                    <span className={`session-subject-badge ${s.subject_name === 'Общее' ? 'outline' : ''}`} style={{ color: s.subject_color, borderColor: s.subject_color }}>{s.subject_name}</span>
                    <span>{s.goal}</span>
                    <span className="session-status">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Добавить ребёнка</h3>
            <p>Введите код, который ребёнок создал в своём профиле</p>
            <form onSubmit={handleLinkChild}>
              <input
                type="text"
                placeholder="Код (например: A1B2C3D4)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="invite-code-input"
              />
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowAddModal(false)}>Отмена</button>
                <button type="submit">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSessionModal && selectedChild && (
        <div className="modal-overlay" onClick={() => setShowSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Создать сессию для {selectedChild.name}</h3>
            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label>Цель</label>
                <input
                  type="text"
                  value={sessionForm.goal}
                  onChange={(e) => setSessionForm({ ...sessionForm, goal: e.target.value })}
                  placeholder="Например: Решить задачи по математике"
                  required
                />
              </div>
              <div className="form-group">
                <label>Предмет</label>
                <select
                  className="studly-select"
                  value={sessionForm.subject_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject_id: e.target.value })}
                >
                  <option value="">Выберите предмет</option>
                  {childSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Работа (мин)</label>
                  <input
                    type="number"
                    min="15"
                    max="60"
                    value={sessionForm.work_interval}
                    onChange={(e) => setSessionForm({ ...sessionForm, work_interval: parseInt(e.target.value) || 25 })}
                  />
                </div>
                <div className="form-group">
                  <label>Интервалов</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={sessionForm.intervals_count}
                    onChange={(e) => setSessionForm({ ...sessionForm, intervals_count: parseInt(e.target.value) || 4 })}
                  />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowSessionModal(false)}>Отмена</button>
                <button type="submit">Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={unlinkModal.open}
        title="Отвязать ребёнка"
        message={unlinkModal.child ? `Вы уверены, что хотите отвязать ${unlinkModal.child.name}? Вы больше не сможете видеть его результаты.` : ''}
        confirmText="Отвязать"
        cancelText="Отмена"
        onConfirm={handleUnlinkConfirm}
        onCancel={() => setUnlinkModal({ open: false, child: null })}
        variant="danger"
      />
    </div>
  );
};

export default ParentCabinetPage;
