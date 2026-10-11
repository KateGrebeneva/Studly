import React, { useState, useEffect, useCallback } from 'react';
import { Users, GraduationCap, UserPlus, CheckCircle2, Clock, Activity, Search, Pencil } from 'lucide-react';
import { adminAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import AppLayout from './AppLayout';
import { PageHeader, EmptyState } from './ui';
import './AdminPanelPage.css';

const ROLE_LABELS = { student: 'Ученик', parent: 'Родитель', teacher: 'Учитель', admin: 'Админ' };

const AdminPanelPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'student', theme: 'light' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setStats(await adminAPI.getStats());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const list = await adminAPI.getUsers(roleFilter || undefined, searchTerm || undefined);
      setUsers(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 250);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const openEdit = (u) => {
    setSaveError('');
    setEditUser(u);
    setEditForm({ name: u?.name || '', email: u?.email || '', role: u?.role || 'student', theme: u?.theme || 'light' });
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await adminAPI.updateUser(editUser.id, { ...editForm });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditUser(null);
    } catch (e) {
      setSaveError(e.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const activity = stats?.weeklyActivity || [];
  const maxAct = Math.max(1, ...activity.map((d) => d.minutes || 0));
  const KPIS = stats ? [
    { icon: Users, label: 'Всего пользователей', value: stats.totalUsers, c: 'violet' },
    { icon: GraduationCap, label: 'Учеников', value: stats.students, c: 'denim' },
    { icon: UserPlus, label: 'Родителей', value: stats.parents, c: 'mint' },
    { icon: CheckCircle2, label: 'Завершённых сессий', value: stats.completedSessions, c: 'sun' },
    { icon: Clock, label: 'Часов учёбы', value: Math.floor((stats.totalMinutes || 0) / 60), c: 'violet' },
    { icon: Activity, label: 'Активны сегодня', value: stats.todayActiveUsers, c: 'rose' },
  ] : [];

  return (
    <AppLayout>
      <PageHeader title="Панель администратора" subtitle="Пользователи и активность платформы" />

      {loading ? (
        <div className="ad-kpis">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}</div>
      ) : stats && (
        <section className="ad-top">
          <div className="ad-kpis">
            {KPIS.map(({ icon: Icon, label, value, c }, i) => (
              <div key={label} className={`ad-kpi rise rise-${i + 1}`}>
                <Icon size={19} className={`c-${c}`} />
                <b className="t-num">{value ?? '—'}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {activity.length > 0 && (
            <div className="card card-pad ad-chart rise rise-3">
              <h2 className="t-h2">Минуты учёбы за неделю</h2>
              <div className="ad-bars">
                {activity.map((d, i) => (
                  <div key={i} className="ad-bar" title={`${d.date}: ${d.minutes || 0} мин`}>
                    <span className="ad-bar-val t-num">{d.minutes || 0}</span>
                    <span className="ad-bar-track"><span style={{ height: `${Math.max(3, ((d.minutes || 0) / maxAct) * 100)}%` }} /></span>
                    <span className="ad-bar-day t-num">{d.date ? new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' }) : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="card ad-users rise rise-4">
        <div className="ad-users-head">
          <h2 className="t-h2">Пользователи</h2>
          <div className="ad-filters">
            <div className="input-icon ad-search">
              <Search size={18} />
              <input className="input" type="search" placeholder="Имя или email" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Поиск пользователей" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="select ad-role" aria-label="Фильтр по роли">
              <option value="">Все роли</option>
              {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
        {!usersLoading && users.length === 0 ? (
          <div style={{ padding: '0 1.4rem 1.4rem' }}>
            <EmptyState mood="think" title="Никого не нашли" text="Попробуй изменить запрос или сбросить фильтр роли." />
          </div>
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>Пользователь</th><th>Роль</th><th>Регистрация</th><th><span className="visually-hidden">Действия</span></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="ad-user">
                        <span className="ad-ava">{(u.name || u.email || '?').charAt(0).toUpperCase()}</span>
                        <span className="ad-user-meta"><b>{u.name}</b><small>{u.email} · #{u.id}</small></span>
                      </div>
                    </td>
                    <td><span className={`badge ad-role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td className="t-muted t-num">{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}</td>
                    <td className="ad-actions">
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)} aria-label={`Редактировать ${u.name}`}><Pencil size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={!!editUser}
        title="Редактировать пользователя"
        message={editUser ? (
          <div className="ad-edit">
            <label className="field"><span className="field-label">Имя</span><input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
            <label className="field"><span className="field-label">Email</span><input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></label>
            <div className="ad-edit-row">
              <label className="field"><span className="field-label">Роль</span>
                <select className="select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="field"><span className="field-label">Тема</span>
                <select className="select" value={editForm.theme} onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}>
                  <option value="light">Светлая</option>
                  <option value="dark">Тёмная</option>
                </select>
              </label>
            </div>
            {saveError && <div className="alert alert-error">{saveError}</div>}
          </div>
        ) : ''}
        confirmText={saving ? 'Сохраняю…' : 'Сохранить'}
        cancelText="Отмена"
        onConfirm={handleSaveUser}
        onCancel={() => setEditUser(null)}
        variant="warning"
      />
    </AppLayout>
  );
};

export default AdminPanelPage;
