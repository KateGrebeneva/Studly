import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { authAPI } from './services/api';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  // Шаг формы
  const [step, setStep] = useState(1);

  // Данные формы
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(''); // 'parent', 'teacher', 'student', 'adult'

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const validateStep1 = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Введите email';
    else if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = 'Некорректный email';

    if (!password) newErrors.password = 'Введите пароль';
    else if (password.length < 6) newErrors.password = 'Пароль должен быть не менее 6 символов';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    if (!role) {
      setErrors({ role: 'Выберите роль' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (validateStep2()) {
    setIsLoading(true);
    try {
      // Маппинг ролей: adult -> student, остальные как есть
      const apiRole = role === 'adult' ? 'student' : role;
      
      await authAPI.register({
        email,
        password,
        name: email.split('@')[0], // Временное имя из email
        role: apiRole
      });

      // После регистрации автоматически логинимся
      const loginData = await authAPI.login(email, password);
      const userRole = loginData?.user?.role || apiRole;
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'parent') navigate('/parent');
      else navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: error.message || 'Ошибка при регистрации' });
    } finally {
      setIsLoading(false);
    }
  }
};
  const goBackToPreviousPage = () => {
    setIsLoaded(false);
    setTimeout(() => navigate(-1), 400);
  };

  const roles = [
    { value: 'adult',   label: 'Взрослый',     icon: 'u' },
          { value: 'student', label: 'Школьник',     icon: 'GraduationCap' },
          { value: 'parent',  label: 'Родитель / Учитель', icon: 'Users' },
  ];

  return (
    <div className={`register-page ${isLoaded ? 'loaded' : ''}`}>
      {/* Кнопка назад (на предыдущую страницу) */}
      <button className="back-button" onClick={goBackToPreviousPage}>
        <ArrowLeft size={28} />
      </button>

      <div className="register-container">
        {/* Левая часть */}
        <div className="register-left">
          <div className="left-content">
            <img src="/log.png" alt="Studly" className="mission-img" />
          </div>
        </div>

        {/* Правая часть — форма */}
        <div className="register-right">
          <div className="form-wrapper">
            <div className="form-header">
              <img src="/logo-studly.png" alt="Studly" className="mission-img" />
              <h1>{step === 1 ? 'Создать аккаунт' : ''}</h1>
              <p className="form-subtitle">
                {step === 1
                  ? 'Доступ к задачам, заметкам и проектам в любом месте'
                  : 'Выберите подходящую категорию'}
              </p>
            </div>

            {/* Индикатор шагов */}
            <div className="steps-indicator">
              <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
              <div className={`step-line ${step === 2 ? 'active' : ''}`}></div>
              <div className={`step-dot ${step === 2 ? 'active' : ''}`}></div>
            </div>

            {/* ШАГ 1 — Email и пароль */}
            {step === 1 && (
              <form onSubmit={handleNext} className="register-form">
                <div className="input-group">
                  <label>Введите email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="input-group">
                  <label>Введите пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={errors.password ? 'error' : ''}
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <button type="submit" className="btn-register">
                  Продолжить
                </button>
              </form>
            )}

{step === 2 && (
  <form onSubmit={handleSubmit} className="register-form">
    <div className="roles-list">
      {roles.map((r) => (
        <label
          key={r.value}
          className={`role-item ${role === r.value ? 'selected' : ''}`}
        >
          <input
            type="radio"
            name="role"
            value={r.value}
            checked={role === r.value}
            onChange={(e) => setRole(e.target.value)}
            className="hidden-radio"
          />
          <div className="role-item-content">
            <div className="checkbox">
              {role === r.value && <Check size={20} />}
            </div>
            <span className="role-item-label">{r.label}</span>
          </div>
        </label>
      ))}
    </div>

    {errors.role && <span className="error-text center">{errors.role}</span>}
    {errors.submit && <span className="error-text center">{errors.submit}</span>}

    <div className="step2-buttons">
      <button type="submit" className="btn-register" disabled={isLoading}>
        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
    </div>
  </form>
)}
            {/* Футер */}
            <div className="form-footer">
              <p>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;