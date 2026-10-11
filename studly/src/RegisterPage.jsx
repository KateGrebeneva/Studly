import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, User, GraduationCap, Users, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Timer, Sparkles, BarChart3 } from 'lucide-react';
import { authAPI } from './services/api';
import AuthLayout from './components/AuthLayout';

const ROLES = [
  { value: 'student', label: 'Школьник или студент', icon: GraduationCap, hint: 'Сессии, задачи, статистика и AI-тесты' },
  { value: 'adult', label: 'Учусь сам', icon: User, hint: 'Языки, курсы, самообразование' },
  { value: 'parent', label: 'Родитель или учитель', icon: Users, hint: 'Слежу за прогрессом ученика' },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateStep1 = () => {
    const e = {};
    if (!email) e.email = 'Введи email';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Проверь email — похоже, в нём опечатка';
    if (!password) e.password = 'Придумай пароль';
    else if (password.length < 6) e.password = 'Пароль должен быть не короче 6 символов';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) { setErrors({ role: 'Выбери, кто ты — так Studly подберёт нужные разделы' }); return; }
    setErrors({});
    setIsLoading(true);
    try {
      const apiRole = role === 'adult' ? 'student' : role;
      await authAPI.register({ email, password, name: email.split('@')[0], role: apiRole });
      const loginData = await authAPI.login(email, password);
      const userRole = loginData?.user?.role || apiRole;
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'parent') navigate('/parent');
      else navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: error.message || 'Не удалось зарегистрироваться. Попробуй ещё раз.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      pose={step === 1 ? 'stand' : 'thumbs'}
      mood={step === 1 ? 'idle' : 'cheer'}
      bubble={step === 1 ? 'Привет! Я Спот. Буду учиться вместе с тобой.' : 'Почти готово!'}
      step={`Шаг ${step} из 2`}
      aside={(
        <>
          <h2>Учись в своём ритме</h2>
          <ul>
            <li><Timer size={18} /> Pomodoro-сессии с понятной целью</li>
            <li><Sparkles size={18} /> AI-план и тесты для закрепления</li>
            <li><BarChart3 size={18} /> Статистика без лишних цифр</li>
          </ul>
        </>
      )}
    >
      <h1 className="au-title">{step === 1 ? 'Создать аккаунт' : 'Кто ты в Studly?'}</h1>
      <p className="au-sub">{step === 1 ? 'Займёт меньше минуты' : 'От этого зависит, какие разделы ты увидишь'}</p>
      <div className="au-progress" aria-hidden="true"><i className="on" /><i className={step === 2 ? 'on' : ''} /></div>

      {step === 1 && (
        <form onSubmit={handleNext} className="au-form" noValidate>
          <label className="field">
            <span className="field-label">Email</span>
            <span className="input-icon">
              <Mail size={18} />
              <input className={`input ${errors.email ? 'is-error' : ''}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" aria-invalid={!!errors.email} />
            </span>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          <label className="field">
            <span className="field-label">Пароль</span>
            <span className="input-icon au-pass">
              <Lock size={18} />
              <input className={`input ${errors.password ? 'is-error' : ''}`} type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" autoComplete="new-password" aria-invalid={!!errors.password} />
              <button type="button" className="btn btn-ghost btn-icon btn-sm au-pass-toggle" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}>
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <button type="submit" className="btn btn-primary btn-lg btn-block">Продолжить <ArrowRight size={18} /></button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="au-form">
          <div className="au-roles" role="radiogroup" aria-label="Роль">
            {ROLES.map((r) => (
              <label key={r.value} className={`au-role ${role === r.value ? 'is-active' : ''}`}>
                <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={(e) => setRole(e.target.value)} className="visually-hidden" />
                <span className="au-role-icon"><r.icon size={21} /></span>
                <span className="au-role-text"><b>{r.label}</b><small>{r.hint}</small></span>
                <span className="au-role-check"><Check size={14} strokeWidth={3} /></span>
              </label>
            ))}
          </div>
          {errors.role && <div className="alert alert-error" role="alert">{errors.role}</div>}
          {errors.submit && <div className="alert alert-error" role="alert">{errors.submit}</div>}
          <div className="au-actions">
            <button type="button" className="btn btn-lg" onClick={() => { setStep(1); setErrors({}); }}><ArrowLeft size={18} /> Назад</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>{isLoading ? 'Создаём…' : 'Создать аккаунт'}</button>
          </div>
        </form>
      )}

      <p className="au-foot">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </AuthLayout>
  );
};

export default RegisterPage;
