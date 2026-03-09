import React, { useEffect, useRef, useState } from 'react';
import { 
  BookOpen, Settings, Gamepad2, BarChart3, Calendar, Target, 
  Award, Sparkles, Laptop, CheckCircle, Clock, Palette, DollarSign 
} from 'lucide-react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation
} from 'react-router-dom';
import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';
import NotFound404 from './components/NotFound404';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import StudentInvitationPage from './StudentInvitationPage';
import ParentInvitationPage from './ParentInvitationPage';
import Dashboard from './components/Dashboard';
import SubjectsPage from './components/SubjectsPage';
import SessionPlanningPage from './components/SessionPlanningPage';
import PomodoroTimer from './components/PomodoroTimer';
import SessionCompletePage from './components/SessionCompletePage';
import StatisticsPage from './components/StatisticsPage';
import ProfilePage from './components/ProfilePage';
import AchievementsPage from './components/AchievementsPage';
import AIPlannerPage from './components/AIPlannerPage';
import ParentCabinetPage from './components/ParentCabinetPage';
import AdminPanelPage from './components/AdminPanelPage';
import RoleProtectedRoute from './components/RoleProtectedRoute';


// Обёртка для навигации внутри лендинга
function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrollY, setScrollY] = useState(0);
  const [activeLandingSection, setActiveLandingSection] = useState('about');
  const aboutRef = useRef(null);
  const whyRef = useRef(null);
  const howRef = useRef(null);
  const ctaRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      if (appRef.current) {
        const opacity = Math.min(currentScrollY / 1000, 0.1);
        appRef.current.style.setProperty('--scroll-opacity', opacity);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer для анимаций
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const initObserver = () => {
      const elementsToObserve = document.querySelectorAll('.fade-in');
      elementsToObserve.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight * 1.2 && rect.bottom > -100;
        
        if (isInViewport) {
          setTimeout(() => el.classList.add('visible'), 200);
        } else {
          observer.observe(el);
        }
      });
    };

    setTimeout(initObserver, 100);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToRegister = () => navigate('/register');
  const goToLogin = () => navigate('/login');

  return (
    <div className="App" ref={appRef}>
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <img src="/logo-studly.png" alt="Studly" className="logo-img" />
          </div>
          <nav className="nav">
            <button
              className={`nav-link ${activeLandingSection === 'about' ? 'active' : ''}`}
              onClick={() => {
                setActiveLandingSection('about');
                scrollToSection(aboutRef);
              }}
            >
              О нас
            </button>
            <button
              className={`nav-link ${activeLandingSection === 'why' ? 'active' : ''}`}
              onClick={() => {
                setActiveLandingSection('why');
                scrollToSection(whyRef);
              }}
            >
              Почему именно мы?
            </button>
            <button
              className={`nav-link ${activeLandingSection === 'how' ? 'active' : ''}`}
              onClick={() => {
                setActiveLandingSection('how');
                scrollToSection(howRef);
              }}
            >
              Как работает?
            </button>
          </nav>
          <button className="btn-login" onClick={goToLogin}>
            Войти
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" ref={aboutRef}>
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title fade-in">
              Организуй свое время и получи наслаждение от обучения!
            </h1>
            <p className="hero-subtitle fade-in">
              Создайте эффективное учебное пространство с помощью нашего трекера учёбы
            </p>
            <button className="btn-hero-main fade-in" onClick={goToRegister}>
              Присоединиться
            </button>
          </div>
          <div className="hero-image-wrapper fade-in">
            <div className="mission-image fade-in">
              <img src="/tittle.png" alt="Studly mission" className="mission-img" />
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container mission-container">
          <div className="mission-content">
            <h2 className="mission-title fade-in">Наша <span className="misia">миссия</span></h2>
            <p className="mission-text fade-in">
              Мы создали Studly, чтобы сделать обучение более организованным, эффективным и приятным. 
              Наша цель - помочь каждому достичь своих образовательных целей, независимо от возраста и уровня подготовки.
            </p>
            <p className="mission-text fade-in">
              С помощью современных технологий и интуитивного интерфейса мы превращаем процесс обучения 
              в увлекательное путешествие с четкими целями и видимым прогрессом.
            </p>
          </div>
          <div className="mission-image fade-in">
            <img src="/2.png" alt="Studly mission" className="mission-img" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" ref={whyRef}>
        <div className="container">
          <h2 className="features-title fade-in">
            4 причины, почему с нами удобно и надежно работать
          </h2>
          <div className="features-grid fade-in">
            <div className="feature-card-rounded">
              <div className="feature-card-image">
                <CheckCircle size={48} className="feature-icon" />
              </div>
              <h3 className="feature-card-title">Качество</h3>
              <p className="feature-card-text">
                Мы используем современные технологии и лучшие практики для создания надежного и эффективного продукта.
              </p>
            </div>
            <div className="feature-card-rounded">
              <div className="feature-card-image">
                <Clock size={48} className="feature-icon" />
              </div>
              <h3 className="feature-card-title">Скорость</h3>
              <p className="feature-card-text">
                Быстрое создание планов обучения и мгновенное отслеживание прогресса в реальном времени.
              </p>
            </div>
            <div className="feature-card-rounded">
              <div className="feature-card-image">
                <Palette size={48} className="feature-icon" />
              </div>
              <h3 className="feature-card-title">Разнообразие</h3>
              <p className="feature-card-text">
                Гибкая система настройки под любые образовательные цели и индивидуальные потребности.
              </p>
            </div>
            <div className="feature-card-rounded">
              <div className="feature-card-image">
                <DollarSign size={48} className="feature-icon" />
              </div>
              <h3 className="feature-card-title">Доступность</h3>
              <p className="feature-card-text">
                Доступные цены и бесплатный тариф для начала работы. Каждый может начать использовать Studly уже сегодня.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-section" ref={howRef}>
        <div className="container">
          <h2 className="features-title fade-in">
            Как работает <span className="highlight">сервис?</span>
          </h2>
          <div className="steps-grid fade-in">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon-wrapper">
                <BookOpen className="step-icon" size={32} />
              </div>
              <h3 className="step-title">Родитель/учитель создаёт план</h3>
              <p className="step-description">
                Создайте индивидуальный план обучения с учётом всех особенностей и целей.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon-wrapper">
                <Settings className="step-icon" size={32} />
              </div>
              <h3 className="step-title">Система распределяет занятия и сроки</h3>
              <p className="step-description">
                Автоматическое распределение заданий и установка оптимальных сроков выполнения.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon-wrapper">
                <Gamepad2 className="step-icon" size={32} />
              </div>
              <h3 className="step-title">Дети получают интерактивное задание и выполняют шаги</h3>
              <p className="step-description">
                Интерактивный формат заданий делает обучение увлекательным и эффективным.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon-wrapper">
                <BarChart3 className="step-icon" size={32} />
              </div>
              <h3 className="step-title">Все участники видят аналитику и прогресс</h3>
              <p className="step-description">
                Подробная аналитика прогресса доступна всем участникам образовательного процесса.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="join-section" ref={ctaRef}>
        <div className="container">
          <h2 className="features-title fade-in">
            Давай учиться <span className="highlight">вместе!</span>
          </h2>
          <div className="join-images fade-in">
            <div className="join-image-card">
              <div className="join-image-placeholder">
                <img src="/1.png" alt="Studly" className="mission-img" />
              </div>
            </div>
            <div className="join-image-card">
              <div className="join-image-placeholder">
                <img src="/1_1.png" alt="Studly" className="mission-img" />
              </div>
            </div>
            <div className="join-image-card">
              <div className="join-image-placeholder">
                <img src="/1_2.png" alt="Studly" className="mission-img" />
              </div>
            </div>
          </div>
          <div className="join-button-wrapper fade-in">
            <button className="btn-join" onClick={goToRegister}>
              Начать
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Главный компонент с роутингом
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/student-invitation" element={<StudentInvitationPage />} />
        <Route path="/parent-invitation" element={<ParentInvitationPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/parent" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['parent']}><ParentCabinetPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']}><AdminPanelPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><Dashboard /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><SubjectsPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><SessionPlanningPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/pomodoro" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><PomodoroTimer /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/session-complete" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><SessionCompletePage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><StatisticsPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><AchievementsPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/ai-planner" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['student', 'teacher']}><AIPlannerPage /></RoleProtectedRoute></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </Router>
  );
}

export default App;