import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Settings, Bell, Lock, Palette, LogOut, Edit2, Save, X, Home, BookOpen, Calendar, TrendingUp, Sparkles, Users, Shield, Copy } from 'lucide-react';
import { profileAPI, authAPI } from '../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: 'student',
    avatar: null
  });

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('studly-theme') || 'light';
  });
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const user = authAPI.getCurrentUser();
        if (user) setProfileData({ name: user.name || '', email: user.email || '', role: user.role || 'student', avatar: null });
        const p = await profileAPI.get();
        if (p) setProfileData(prev => ({ ...prev, name: p.name || prev.name, email: p.email || prev.email, role: p.role || prev.role }));
        if (p?.theme) setTheme(p.theme);
        if ((p || user)?.role === 'student') {
          try {
            const codeRes = await profileAPI.getInviteCode();
            setInviteCode(codeRes?.code || '');
          } catch (_) {}
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studly-theme', theme);
  }, [theme]);

  const isActive = (path) => location.pathname === path;

  const handleSave = async () => {
    try {
      const updated = await profileAPI.update({ name: profileData.name, theme });
      if (updated) {
        const userStr = localStorage.getItem('studly_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.name = updated.name ?? user.name;
          user.theme = updated.theme ?? user.theme;
          localStorage.setItem('studly_user', JSON.stringify(user));
        }
      }
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    try {
      const updated = await profileAPI.update({ theme: newTheme });
      if (updated) {
        const userStr = localStorage.getItem('studly_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.theme = updated.theme ?? newTheme;
          localStorage.setItem('studly_user', JSON.stringify(user));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const handleGenerateCode = async () => {
    try {
      const res = await profileAPI.generateInviteCode();
      setInviteCode(res?.code || '');
    } catch (e) {
      console.error(e);
    }
  };

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
    }
  };

  const isStudent = profileData.role === 'student';
  const isParent = profileData.role === 'parent';
  const isAdmin = profileData.role === 'admin';

  return (
    <div className={`profile-page ${isLoaded ? 'loaded' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          {isStudent || profileData.role === 'teacher' ? (
            <>
              <button className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
                <Home size={20} /><span>Главная</span>
              </button>
              <button className={`nav-item ${isActive('/subjects') ? 'active' : ''}`} onClick={() => navigate('/subjects')}>
                <BookOpen size={20} /><span>Предметы</span>
              </button>
              <button className={`nav-item ${isActive('/sessions') ? 'active' : ''}`} onClick={() => navigate('/sessions')}>
                <Calendar size={20} /><span>Сессии</span>
              </button>
              <button className={`nav-item ${isActive('/statistics') ? 'active' : ''}`} onClick={() => navigate('/statistics')}>
                <TrendingUp size={20} /><span>Статистика</span>
              </button>
              <button className={`nav-item ${isActive('/ai-planner') ? 'active' : ''}`} onClick={() => navigate('/ai-planner')}>
                <Sparkles size={20} /><span>AI Планировщик</span>
              </button>
            </>
          ) : isParent ? (
            <button className={`nav-item ${isActive('/parent') ? 'active' : ''}`} onClick={() => navigate('/parent')}>
              <Users size={20} /><span>Мои дети</span>
            </button>
          ) : isAdmin ? (
            <button className={`nav-item ${isActive('/admin') ? 'active' : ''}`} onClick={() => navigate('/admin')}>
              <Shield size={20} /><span>Панель админа</span>
            </button>
          ) : null}
          <button className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={20} /><span>Профиль</span>
          </button>
        </nav>
      </aside>

      <main className="profile-main">
       

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="avatar-container">
                <div className="avatar-placeholder">
                  {(profileData.name || '?').charAt(0).toUpperCase()}
                </div>
                {isEditing && (
                  <button className="avatar-edit-btn">
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
              <div className="profile-info">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="profile-input"
                    />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="profile-input"
                    />
                  </>
                ) : (
                  <>
                    <h2 className="profile-name">{profileData.name}</h2>
                    <p className="profile-email">{profileData.email}</p>
                    <span className="profile-role">{profileData.role}</span>
                  </>
                )}
              </div>
            </div>

            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button className="btn-save" onClick={handleSave}>
                    <Save size={18} />
                    Сохранить
                  </button>
                  <button className="btn-cancel" onClick={handleCancel}>
                    <X size={18} />
                    Отмена
                  </button>
                </>
              ) : (
                <button className="btn-edit" onClick={() => setIsEditing(true)}>
                  <Edit2 size={18} />
                  Редактировать
                </button>
              )}
            </div>
          </div>

          {isStudent && (
            <div className="invite-code-section">
              <h2 className="settings-title">Код для родителей</h2>
              <p className="invite-code-desc">Дай этот код родителю, чтобы он мог видеть твои результаты и планировать сессии</p>
              <div className="invite-code-block">
                <code className="invite-code">{inviteCode || '—'}</code>
                <div className="invite-code-actions">
                  <button type="button" className="btn-copy" onClick={copyCode} disabled={!inviteCode}>
                    <Copy size={16} /> Копировать
                  </button>
                  <button type="button" className="btn-regenerate" onClick={handleGenerateCode}>
                    Сгенерировать новый
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="settings-section">
            <h2 className="settings-title">Настройки</h2>
            
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-icon">
                  <Bell size={20} />
                </div>
                <div className="setting-content">
                  <h3 className="setting-name">Уведомления</h3>
                  <p className="setting-desc">Управление уведомлениями</p>
                </div>
                <button className="setting-toggle">
                  <div className="toggle-switch active"></div>
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-icon">
                  <Lock size={20} />
                </div>
                <div className="setting-content">
                  <h3 className="setting-name">Безопасность</h3>
                  <p className="setting-desc">Смена пароля</p>
                </div>
                <button className="setting-arrow">→</button>
              </div>

              <div className="setting-item">
                <div className="setting-icon">
                  <Palette size={20} />
                </div>
                <div className="setting-content">
                  <h3 className="setting-name">Тема</h3>
                  <p className="setting-desc">Внешний вид приложения</p>
                </div>
                <div className="theme-toggle-group">
                  <button
                    type="button"
                    className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    Светлая
                  </button>
                  <button
                    type="button"
                    className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    Тёмная
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="logout-section">
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={20} />
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;

