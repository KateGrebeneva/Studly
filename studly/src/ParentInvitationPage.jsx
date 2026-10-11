import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogIn } from 'lucide-react';
import { parentAPI } from './services/api';
import AuthLayout from './components/AuthLayout';

const ParentInvitationPage = () => {
  const navigate = useNavigate();
  const isAuthed = (() => { try { return !!localStorage.getItem('studly_token'); } catch { return false; } })();
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = invitationCode.trim().toUpperCase();
    if (!code) { setError('Введите код приглашения'); return; }
    if (!/^[A-Z0-9-]{4,16}$/.test(code)) { setError('Код состоит из латинских букв и цифр, например A1B2C3D4'); return; }
    setError('');
    setLoading(true);
    try {
      await parentAPI.linkChild(code);
      navigate('/parent');
    } catch (err) {
      setError(err.message || 'Код не подошёл. Попросите ребёнка создать новый в профиле.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      pose="sit"
      mood="idle"
      bubble="Введите код — и я всё покажу."
      aside={(
        <>
          <h2>Будьте рядом с учёбой ребёнка</h2>
          <p>Время занятий, выполненные задачи и серия дней — в одном спокойном кабинете.</p>
        </>
      )}
    >
      <h1 className="au-title">Подключение к ученику</h1>
      <p className="au-sub">Ребёнок найдёт код в своём Studly: раздел «Профиль» → «Код для родителя».</p>

      {!isAuthed ? (
        <div className="au-form">
          <div className="alert alert-info">Войдите в аккаунт родителя, чтобы привязать ученика.</div>
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/login')}><LogIn size={18} /> Войти</button>
          <button type="button" className="btn btn-lg btn-block" onClick={() => navigate('/register')}>Создать аккаунт</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="au-form" noValidate>
          <label className="field">
            <span className="field-label">Код приглашения</span>
            <input className={`input au-code-input ${error ? 'is-error' : ''}`} value={invitationCode}
              onChange={(e) => { setInvitationCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="A1B2C3D4" autoComplete="off" aria-invalid={!!error} />
            {error && <span className="field-error" role="alert">{error}</span>}
          </label>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}><KeyRound size={18} /> {loading ? 'Подключаем…' : 'Подключить'}</button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ParentInvitationPage;
