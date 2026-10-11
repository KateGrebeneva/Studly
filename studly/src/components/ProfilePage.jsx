import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Pencil, Save, X, Copy, RefreshCw, Sun, Moon, Volume2, KeyRound, Check } from 'lucide-react';
import { profileAPI, authAPI } from '../services/api';
import { isSoundEnabled, setSoundEnabled, playChime } from '../utils/chime';
import AppLayout, { applyTheme, getStoredTheme } from './AppLayout';
import { PageHeader, Mascot, Spots, useToast } from './ui';
import './ProfilePage.css';

const ROLE_LABELS = { student: 'Ученик', teacher: 'Учитель', parent: 'Родитель', admin: 'Администратор' };

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', role: 'student' });
  const [draftName, setDraftName] = useState('');
  const [theme, setTheme] = useState(getStoredTheme);
  const [sound, setSound] = useState(isSoundEnabled);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const user = authAPI.getCurrentUser();
        if (user) setProfileData({ name: user.name || '', email: user.email || '', role: user.role || 'student' });
        const p = await profileAPI.get();
        if (p) setProfileData((prev) => ({ ...prev, name: p.name || prev.name, email: p.email || prev.email, role: p.role || prev.role }));
        if (p?.theme) {
          setTheme(p.theme);
          applyTheme(p.theme);
          window.dispatchEvent(new CustomEvent('studly-theme', { detail: p.theme }));
        }
        if ((p || user)?.role === 'student') {
          try {
            const codeRes = await profileAPI.getInviteCode();
            setInviteCode(codeRes?.code || '');
          } catch { /* кода ещё нет */ }
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail);
    window.addEventListener('studly-theme', onTheme);
    return () => window.removeEventListener('studly-theme', onTheme);
  }, []);

  const startEdit = () => { setDraftName(profileData.name); setIsEditing(true); };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!draftName.trim()) return;
    try {
      const updated = await profileAPI.update({ name: draftName.trim(), theme });
      const name = updated?.name ?? draftName.trim();
      setProfileData((prev) => ({ ...prev, name }));
      const userStr = localStorage.getItem('studly_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.name = name;
        user.theme = updated?.theme ?? user.theme;
        localStorage.setItem('studly_user', JSON.stringify(user));
      }
      setIsEditing(false);
      showToast('Профиль сохранён');
    } catch (err) {
      showToast(err.message || 'Не удалось сохранить профиль', 'error');
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    window.dispatchEvent(new CustomEvent('studly-theme', { detail: newTheme }));
    try {
      const updated = await profileAPI.update({ theme: newTheme });
      const userStr = localStorage.getItem('studly_user');
      if (userStr && updated) {
        const user = JSON.parse(userStr);
        user.theme = updated.theme ?? newTheme;
        localStorage.setItem('studly_user', JSON.stringify(user));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) playChime();
  };

  const handleLogout = () => { authAPI.logout(); navigate('/login'); };

  const handleGenerateCode = async () => {
    try {
      const res = await profileAPI.generateInviteCode();
      setInviteCode(res?.code || '');
      showToast('Новый код создан. Старый больше не работает.');
    } catch (err) {
      showToast(err.message || 'Не удалось создать код', 'error');
    }
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Не удалось скопировать — выдели код вручную', 'error');
    }
  };

  const isStudent = profileData.role === 'student';
  const initial = (profileData.name || profileData.email || '?').charAt(0).toUpperCase();

  return (
    <AppLayout>
      <PageHeader title="Профиль" subtitle="Личные данные и настройки приложения" />

      <div className="pf-layout">
        <section className="pf-card panel-violet rise">
          <Spots set="b" opacity={0.1} />
          <div className="pf-id">
            <span className="pf-avatar" aria-hidden="true">{initial}</span>
            {isEditing ? (
              <form className="pf-edit" onSubmit={handleSave}>
                <label className="visually-hidden" htmlFor="pf-name">Имя</label>
                <input id="pf-name" className="input" value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus placeholder="Как тебя зовут?" />
                <div className="pf-edit-actions">
                  <button type="submit" className="btn btn-ink btn-sm" disabled={!draftName.trim()}><Save size={16} /> Сохранить</button>
                  <button type="button" className="btn btn-on-panel btn-sm" onClick={() => setIsEditing(false)}><X size={16} /> Отмена</button>
                </div>
              </form>
            ) : (
              <div className="pf-meta">
                <h2 className="pf-name">{profileData.name || 'Без имени'}</h2>
                <p className="pf-email">{profileData.email}</p>
                <span className="pf-role">{ROLE_LABELS[profileData.role] || profileData.role}</span>
              </div>
            )}
          </div>
          {!isEditing && (
            <button type="button" className="btn btn-on-panel btn-sm pf-edit-btn" onClick={startEdit}><Pencil size={15} /> Изменить имя</button>
          )}
          <Mascot variant="bust" pose="wave" mood="idle" className="pf-mascot" cycle={['wave', 'thumbs', 'playful', 'jump']} />
        </section>

        <div className="pf-col">
          {isStudent && (
            <section className="card card-pad pf-invite rise rise-1">
              <div className="pf-invite-head">
                <span className="pf-icon"><KeyRound size={20} /></span>
                <div>
                  <h2 className="t-h2">Код для родителя или учителя</h2>
                  <p className="t-muted t-small">Взрослый вводит его в своём кабинете и видит твои результаты, а также может назначать сессии.</p>
                </div>
              </div>
              <div className="pf-code">
                <code className="t-num" aria-label="Код приглашения">{inviteCode || '— — — —'}</code>
                <div className="pf-code-actions">
                  <button type="button" className="btn btn-soft btn-sm" onClick={copyCode} disabled={!inviteCode}>
                    {copied ? <><Check size={16} /> Скопировано</> : <><Copy size={16} /> Копировать</>}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleGenerateCode}><RefreshCw size={16} /> {inviteCode ? 'Новый код' : 'Создать код'}</button>
                </div>
              </div>
            </section>
          )}

          <section className="card pf-settings rise rise-2">
            <h2 className="t-h2 pf-settings-title">Настройки</h2>
            <div className="pf-row">
              <span className="pf-icon">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</span>
              <div className="pf-row-text">
                <h3>Тема оформления</h3>
                <p>Тёмная бережёт глаза вечером</p>
              </div>
              <div className="segmented" role="radiogroup" aria-label="Тема">
                <button type="button" role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'is-active' : ''} onClick={() => handleThemeChange('light')}>Светлая</button>
                <button type="button" role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'is-active' : ''} onClick={() => handleThemeChange('dark')}>Тёмная</button>
              </div>
            </div>
            <div className="pf-row">
              <span className="pf-icon"><Volume2 size={20} /></span>
              <div className="pf-row-text">
                <h3>Звуковой сигнал</h3>
                <p>Мягкий звук в конце каждого интервала таймера</p>
              </div>
              <button type="button" role="switch" aria-checked={sound} className={`pf-switch ${sound ? 'is-on' : ''}`} onClick={toggleSound} aria-label="Звуковой сигнал">
                <span />
              </button>
            </div>
          </section>

          <button type="button" className="btn btn-danger-soft pf-logout rise rise-3" onClick={handleLogout}><LogOut size={18} /> Выйти из аккаунта</button>
        </div>
      </div>
      {toast}
    </AppLayout>
  );
};

export default ProfilePage;
