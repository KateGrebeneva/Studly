import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogIn } from 'lucide-react';
import { authAPI } from './services/api';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Введите email и пароль');
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

  const goBack = () => {
    setIsLoaded(false);
    setTimeout(() => navigate(-1), 300);
  };

  return (
    <div className={`login-page ${isLoaded ? 'loaded' : ''}`}>
      <button className="back-button" onClick={goBack}>
        <ArrowLeft size={28} />
      </button>

      <div className="login-container">
        <div className="login-left">
          <div className="left-content">
            <img src="/log.png" alt="Studly" className="login-left-img" />
            <h2>С возвращением!</h2>
            <p>Войди в свой аккаунт и продолжай учёбу</p>
          </div>
        </div>

        <div className="login-right">
          <div className="form-wrapper">
            <div className="form-header">
              <img src="/logo-studly.png" alt="Studly" className="form-logo" />
              <h1>Вход в аккаунт</h1>
              <p className="form-subtitle">Email и пароль</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <label>Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="error-text">{error}</p>}

              <button type="submit" className="btn-login-submit" disabled={isLoading}>
                <LogIn size={20} />
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
            </form>

            <div className="form-footer">
              <p>
                Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
