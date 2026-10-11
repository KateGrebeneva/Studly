import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authAPI } from './services/api';
import AuthLayout from './components/AuthLayout';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Введи email и пароль');
      return;
    }
    setIsLoading(true);
    try {
      const data = await authAPI.login(email, password);
      const role = data?.user?.role || 'student';
      if (role === 'admin') navigate('/admin');
      else if (role === 'parent') navigate('/parent');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      pose={error ? 'surprised' : 'wave'}
      mood="idle"
      bubble={error ? 'Хм, что-то не сходится…' : 'С возвращением! Я скучал.'}
      aside={(
        <>
          <h2>Продолжим с того места, где ты остановился</h2>
          <p>Твой план, серия дней и прогресс по предметам уже ждут.</p>
        </>
      )}
    >
      <h1 className="au-title">Вход в Studly</h1>
      <p className="au-sub">Email и пароль, которые ты указал при регистрации</p>

      <form onSubmit={handleSubmit} className="au-form" noValidate>
        <label className="field">
          <span className="field-label">Email</span>
          <span className="input-icon">
            <Mail size={18} />
            <input className={`input ${error ? 'is-error' : ''}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" />
          </span>
        </label>
        <label className="field">
          <span className="field-label">Пароль</span>
          <span className="input-icon au-pass">
            <Lock size={18} />
            <input className={`input ${error ? 'is-error' : ''}`} type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" autoComplete="current-password" />
            <button type="button" className="btn btn-ghost btn-icon btn-sm au-pass-toggle" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isLoading}>
          <LogIn size={19} /> {isLoading ? 'Входим…' : 'Войти'}
        </button>
      </form>

      <p className="au-foot">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
    </AuthLayout>
  );
};

export default LoginPage;
