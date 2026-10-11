import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Logo, Mascot } from './ui';
import './NotFound404.css';

const NotFound404 = () => {
  const navigate = useNavigate();
  const home = (() => {
    try {
      if (!localStorage.getItem('studly_token')) return '/';
      const role = JSON.parse(localStorage.getItem('studly_user') || '{}').role;
      return role === 'parent' ? '/parent' : role === 'admin' ? '/admin' : '/dashboard';
    } catch { return '/'; }
  })();

  return (
    <div className="nf">
      <header className="nf-top">
        <button type="button" className="nf-logo" onClick={() => navigate('/')} aria-label="Studly — на главную"><Logo size={30} /></button>
      </header>
      <main className="nf-main">
        <div className="nf-stage">
          <span className="nf-num" aria-hidden="true">404</span>
          <Mascot variant="full" pose="surprised" mood="think" className="nf-mascot" cycle={['surprised', 'back', 'grumpy', 'shy']} />
        </div>
        <h1 className="nf-title">Кажется, мы свернули не туда</h1>
        <p className="nf-sub">Такой страницы нет — возможно, ссылка устарела. Спот уже ищет дорогу обратно.</p>
        <div className="nf-actions">
          <button type="button" className="btn btn-lg" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Назад</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(home)}><Home size={18} /> {home === '/' ? 'На главную' : 'К учёбе'}</button>
        </div>
      </main>
    </div>
  );
};

export default NotFound404;
