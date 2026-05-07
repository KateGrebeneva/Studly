import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, GraduationCap, UserPlus, CheckCircle2, Clock, Activity, User, LogOut, Search, Pencil } from 'lucide-react';
import { adminAPI, authAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import './AdminPanelPage.css';

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'student', theme: 'light' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, searchTerm]);

  const loadData = async () => {
    try {
      const s = await adminAPI.getStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const list = await adminAPI.getUsers(roleFilter || undefined, searchTerm || undefined);
      setUsers(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (u) => {
    setSaveError('');
    setEditUser(u);
    setEditForm({
      name: u?.name || '',
      email: u?.email || '',
      role: u?.role || 'student',
      theme: u?.theme || 'light',
    });
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await adminAPI.updateUser(editUser.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        theme: editForm.theme,
      });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditUser(null);
    } catch (e) {
      setSaveError(e.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const roleLabels = { student: 'Студент', parent: 'Родитель', teacher: 'Учитель', admin: 'Админ' };

  return (
    <div className="admin-panel-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item active`} onClick={() => navigate('/admin')}>
            <Shield size={20} />
            <span>Панель админа</span>
          </button>
          <button className={`nav-item`} onClick={() => navigate('/profile')}>
            <User size={20} />
            <span>Профиль</span>
          </button>
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Выйти</span>
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Панель администратора</h1>
        </header>

        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <>
            {stats && (
              <section className="admin-stats">
                <h2>Статистика</h2>
                <div className="stats-cards stagger-children">
                  <div className="admin-stat-card">
                    <Users size={20} className="stat-icon stat-icon-sm" />
                    <div>
                      <div className="stat-value">{stats.totalUsers}</div>
                      <div className="stat-label">Всего пользователей</div>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <GraduationCap size={20} className="stat-icon stat-icon-sm" />
                    <div>
                      <div className="stat-value">{stats.students}</div>
                      <div className="stat-label">Студентов</div>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <UserPlus size={20} className="stat-icon stat-icon-sm" />
                    <div>
                      <div className="stat-value">{stats.parents}</div>
                      <div className="stat-label">Родителей</div>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <CheckCircle2 size={20} className="stat-icon stat-icon-sm" />
                    <div>
                      <div className="stat-value">{stats.completedSessions}</div>
                      <div className="stat-label">Завершённых сессий</div>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <Clock size={20} className="stat-icon stat-icon-sm" />
                    <div>
                      <div className="stat-value">{Math.floor(stats.totalMinutes / 60)}ч</div>
                      <div className="stat-label">Всего времени учёбы</div>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <Activity size={20} className="stat-icon stat-icon-sm" />
                    <div>
                      <div className="stat-value">{stats.todayActiveUsers}</div>
                      <div className="stat-label">Активных сегодня</div>
                    </div>
                  </div>
                </div>

                {stats.weeklyActivity && stats.weeklyActivity.length > 0 && (
                  <div className="chart-section">
                    <h3>Активность за неделю</h3>
                    <div className="chart-bars">
                      {stats.weeklyActivity.map((d, i) => (
                        <div key={i} className="chart-bar-item">
                          <div
                            className="chart-bar-fill"
                            style={{ height: `${Math.min(100, (d.minutes || 0) / 10)}%` }}
                          />
                          <span className="chart-label">{d.date?.slice(5) || ''}</span>
                          <span className="chart-value">{d.minutes || 0} мин</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="admin-users">
              <h2>Пользователи</h2>
              <div className="users-filters">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Поиск по имени или email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="studly-select role-filter"
                >
                  <option value="">Все роли</option>
                  <option value="student">Студент</option>
                  <option value="parent">Родитель</option>
                  <option value="teacher">Учитель</option>
                  <option value="admin">Админ</option>
                </select>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя</th>
                      <th>Email</th>
                      <th>Роль</th>
                      <th>Регистрация</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge role-${u.role}`}>{roleLabels[u.role] || u.role}</span></td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '-'}</td>
                        <td className="users-actions">
                          <button className="btn-user-edit" onClick={() => openEdit(u)} title="Редактировать">
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <ConfirmModal
        isOpen={!!editUser}
        title="Редактировать пользователя"
        message={
          editUser ? (
            <div className="admin-edit-form">
              <div className="admin-edit-row">
                <label>Имя</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="admin-edit-row">
                <label>Email</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="admin-edit-row">
                <label>Роль</label>
                <select className="studly-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="student">Студент</option>
                  <option value="parent">Родитель</option>
                  <option value="teacher">Учитель</option>
                  <option value="admin">Админ</option>
                </select>
              </div>
              <div className="admin-edit-row">
                <label>Тема</label>
                <select className="studly-select" value={editForm.theme} onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}>
                  <option value="light">Светлая</option>
                  <option value="dark">Тёмная</option>
                </select>
              </div>
              {saveError && <div className="admin-edit-error">{saveError}</div>}
            </div>
          ) : ''
        }
        confirmText={saving ? 'Сохраняю...' : 'Сохранить'}
        cancelText="Отмена"
        onConfirm={handleSaveUser}
        onCancel={() => setEditUser(null)}
        variant="warning"
      />
    </div>
  );
};

export default AdminPanelPage;
