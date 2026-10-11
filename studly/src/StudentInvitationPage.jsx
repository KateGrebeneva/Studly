import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, RefreshCw, ArrowRight, LogIn } from 'lucide-react';
import { profileAPI } from './services/api';
import AuthLayout from './components/AuthLayout';

const StudentInvitationPage = () => {
  const navigate = useNavigate();
  const isAuthed = (() => { try { return !!localStorage.getItem('studly_token'); } catch { return false; } })();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(isAuthed);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthed) return;
    const load = async () => {
      try {
        const res = await profileAPI.getInviteCode();
        setCode(res?.code || '');
      } catch { /* кода пока нет */ } finally { setLoading(false); }
    };
    load();
  }, [isAuthed]);

  const generate = async () => {
    setError('');
    try {
      const res = await profileAPI.generateInviteCode();
      setCode(res?.code || '');
    } catch (e) {
      setError(e.message || 'Не удалось создать код');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setError('Не удалось скопировать — перепиши код вручную'); }
  };

  return (
    <AuthLayout
      pose="jump"
      mood="cheer"
      bubble="Вдвоём учиться веселее!"
      aside={(
        <>
          <h2>Пригласи родителя или учителя</h2>
          <p>Взрослый увидит твой прогресс и сможет назначать сессии. Твои задачи и заметки останутся твоими.</p>
        </>
      )}
    >
      <h1 className="au-title">Код приглашения</h1>
      <p className="au-sub">Отправь этот код родителю или учителю — он введёт его в своём кабинете Studly.</p>

      {!isAuthed ? (
        <div className="au-form">
          <div className="alert alert-info">Чтобы получить код, сначала войди в свой аккаунт.</div>
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/login')}><LogIn size={18} /> Войти</button>
        </div>
      ) : (
        <>
          <div className="au-code" aria-live="polite">
            <small>Твой код</small>
            <b className="t-num">{loading ? '…' : (code || '— — — —')}</b>
          </div>
          {error && <div className="alert alert-error" role="alert" style={{ marginTop: '1rem' }}>{error}</div>}
          <div className="au-form">
            {code ? (
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={copy}>
                {copied ? <><Check size={18} /> Скопировано</> : <><Copy size={18} /> Скопировать код</>}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={generate} disabled={loading}><RefreshCw size={18} /> Создать код</button>
            )}
            <button type="button" className="btn btn-lg btn-block" onClick={() => navigate('/dashboard')}>Пропустить <ArrowRight size={18} /></button>
          </div>
        </>
      )}
    </AuthLayout>
  );
};

export default StudentInvitationPage;
