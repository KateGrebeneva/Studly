import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, CalendarClock, BarChart3, Trophy, Sparkles, User,
  Users, Shield, LogOut, Moon, Sun, MoreHorizontal, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { authAPI, profileAPI } from '../services/api';
import { Logo, Mascot, Modal } from './ui';
import './AppLayout.css';

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Главная', short: 'Главная', icon: Home },
  { to: '/subjects', label: 'Предметы и задачи', short: 'Предметы', icon: BookOpen },
  { to: '/sessions', label: 'Сессии', short: 'Сессии', icon: CalendarClock },
  { to: '/statistics', label: 'Статистика', short: 'Статистика', icon: BarChart3 },
  { to: '/achievements', label: 'Цели и награды', short: 'Награды', icon: Trophy },
  { to: '/ai-planner', label: 'AI-планировщик', short: 'AI', icon: Sparkles },
  { to: '/profile', label: 'Профиль', short: 'Профиль', icon: User },
];
const PARENT_NAV = [
  { to: '/parent', label: 'Мои дети', short: 'Дети', icon: Users },
  { to: '/profile', label: 'Профиль', short: 'Профиль', icon: User },
];
const ADMIN_NAV = [
  { to: '/admin', label: 'Панель админа', short: 'Панель', icon: Shield },
  { to: '/profile', label: 'Профиль', short: 'Профиль', icon: User },
];

const ROLE_LABELS = { student: 'Ученик', teacher: 'Учитель', parent: 'Родитель', admin: 'Администратор' };

const TIPS = [
  'Начни с самой трудной задачи — пока голова свежая.',
  'Короткий перерыв после интервала — часть работы, не пропускай его.',
  'Закрепи тему AI-тестом сразу после сессии: так она запомнится лучше.',
  'Пусть у каждой сессии будет одна конкретная цель.',
  'Регулярность важнее длительности: 25 минут каждый день лучше 3 часов раз в неделю.',
  'Запланируй завтрашнюю сессию заранее — утром будет проще начать.',
  'Отметь выполненную задачу — маленькая победа тоже победа.',
];

// куда уехать анимацией: зависит от того, откуда пришли
let lastNavIndex = null;

const NO_SWIPE = 'input, textarea, select, .segmented, .ai-zone-chart, .pr-list, .ad-table-wrap, .modal, [data-no-swipe]';

export const getStoredTheme = () => {
  try { return localStorage.getItem('studly-theme') || 'light'; } catch { return 'light'; }
};

export const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('studly-theme', theme); } catch { /* ignore */ }
};

const AppLayout = ({ children, className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authAPI.getCurrentUser() || {};
  const role = user.role || 'student';
  const nav = role === 'parent' ? PARENT_NAV : role === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const [theme, setTheme] = useState(getStoredTheme);
  const [moreOpen, setMoreOpen] = useState(false);
  const tip = useMemo(() => TIPS[new Date().getDate() % TIPS.length], []);
  const [swipe, setSwipe] = useState(null);
  const touch = useRef(null);

  const navIndex = nav.findIndex((n) => location.pathname.startsWith(n.to));
  // направление считаем один раз, иначе анимация перезапускается
  const [enterClass] = useState(() => (lastNavIndex === null || navIndex === -1 || navIndex === lastNavIndex
    ? '' : navIndex > lastNavIndex ? 'from-right' : 'from-left'));
  useEffect(() => { lastNavIndex = navIndex; }, [navIndex]);

  // свайп на телефоне — соседний раздел
  const onTouchStart = (e) => {
    if (e.touches.length !== 1 || window.innerWidth > 860 || e.target.closest(NO_SWIPE)) { touch.current = null; return; }
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, locked: null };
  };
  const onTouchMove = (e) => {
    const s = touch.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.locked === null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) s.locked = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
    if (s.locked !== 'x') return;
    const target = dx < 0 ? navIndex + 1 : navIndex - 1;
    if (target < 0 || target >= nav.length) { setSwipe(null); return; }
    setSwipe({ dir: dx < 0 ? 'right' : 'left', progress: Math.min(1, Math.abs(dx) / 90) });
  };
  const onTouchEnd = (e) => {
    const s = touch.current;
    touch.current = null;
    setSwipe(null);
    if (!s || s.locked !== 'x') return;
    const dx = e.changedTouches[0].clientX - s.x;
    if (Math.abs(dx) < 90 || navIndex === -1) return;
    const target = dx < 0 ? navIndex + 1 : navIndex - 1;
    if (target >= 0 && target < nav.length) navigate(nav[target].to);
  };

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'studly-theme' && e.newValue) setTheme(e.newValue); };
    const onThemeEvent = (e) => setTheme(e.detail);
    window.addEventListener('storage', onStorage);
    window.addEventListener('studly-theme', onThemeEvent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('studly-theme', onThemeEvent);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.dispatchEvent(new CustomEvent('studly-theme', { detail: next }));
    profileAPI.update({ theme: next }).catch(() => {});
  };

  const logout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const mobilePrimary = nav.length > 5 ? nav.slice(0, 4) : nav;
  const mobileMore = nav.length > 5 ? nav.slice(4) : [];
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className={`shell ${className}`}>
      <aside className="shell-side" aria-label="Основная навигация">
        <button type="button" className="shell-logo" onClick={() => navigate(nav[0].to)} aria-label="Studly — на главную">
          <Logo size={34} />
        </button>

        <nav className="shell-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `shell-link ${isActive ? 'is-active' : ''}`}>
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {role !== 'admin' && (
          <div className="shell-tip">
            <Mascot variant="head" mood="curious" className="shell-tip-mascot" decorative />
            <p className="shell-tip-title">Совет Спота</p>
            <p className="shell-tip-text">{tip}</p>
          </div>
        )}

        <div className="shell-foot">
          <div className="shell-user">
            <span className="shell-avatar" aria-hidden="true">{initial}</span>
            <span className="shell-user-meta">
              <span className="shell-user-name">{user.name || 'Без имени'}</span>
              <span className="shell-user-role">{ROLE_LABELS[role] || role}</span>
            </span>
          </div>
          <div className="shell-foot-actions">
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} title="Тема">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={logout} aria-label="Выйти" title="Выйти">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* верх на телефоне */}
      <header className="shell-top">
        <button type="button" className="shell-logo" onClick={() => navigate(nav[0].to)} aria-label="Studly — на главную">
          <Logo size={30} />
        </button>
        <div className="shell-top-actions">
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="shell-avatar" onClick={() => navigate('/profile')} aria-label="Профиль">{initial}</button>
        </div>
      </header>

      <main
        className={`shell-main page-enter ${enterClass}`}
        id="main"
        key={location.pathname}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </main>

      {swipe && (
        <span className={`swipe-hint ${swipe.dir}`} style={{ opacity: swipe.progress, transform: `scale(${0.6 + swipe.progress * 0.4})` }} aria-hidden="true">
          {swipe.dir === 'right' ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </span>
      )}

      {/* нижние вкладки */}
      <nav className="shell-tabs" aria-label="Навигация">
        {mobilePrimary.map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `shell-tab ${isActive ? 'is-active' : ''}`}>
            <Icon size={21} />
            <span>{short}</span>
          </NavLink>
        ))}
        {mobileMore.length > 0 && (
          <button type="button" className={`shell-tab ${moreOpen ? 'is-active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
            <MoreHorizontal size={21} />
            <span>Ещё</span>
          </button>
        )}
        {mobileMore.length === 0 && (
          <button type="button" className="shell-tab" onClick={logout}>
            <LogOut size={21} />
            <span>Выйти</span>
          </button>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Ещё разделы" icon={MoreHorizontal} className="shell-more">
        <div className="shell-more-list">
          {mobileMore.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={({ isActive }) => `shell-link ${isActive ? 'is-active' : ''}`}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
          <button type="button" className="shell-link" onClick={logout}><LogOut size={20} /><span>Выйти из аккаунта</span></button>
        </div>
      </Modal>
    </div>
  );
};

export default AppLayout;
