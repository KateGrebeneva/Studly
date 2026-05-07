import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles, Brain, Calendar, Clock, Target, TrendingUp,
  Home, BookOpen, User, Trophy, Zap, Lightbulb,
  CheckCircle2, AlertCircle, ArrowRight, Play
} from 'lucide-react';
import { aiAPI, activityZonesAPI, sessionsAPI, subjectsAPI } from '../services/api';
import './AIPlannerPage.css';

const AIPlannerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [productivityAnalysis, setProductivityAnalysis] = useState({
    bestTime: '14:00-16:00',
    bestDay: 'Четверг',
    avgSessionLength: 35,
    focusScore: 70,
    recommendations: ['Загрузите план для персональных рекомендаций']
  });
  const [focusZones, setFocusZones] = useState([]);
  const [applyingId, setApplyingId] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const zones = await activityZonesAPI.getAll();
        const seen = new Set();
        const unique = (zones || [])
          .map(z => ({ time: z.time, score: z.score, label: z.label }))
          .filter(z => {
            if (seen.has(z.time)) return false;
            seen.add(z.time);
            return true;
          });
        setFocusZones(unique);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const isActive = (path) => location.pathname === path;

  const defaultFocusZones = [
    { time: '09:00-11:00', score: 65, label: 'Средняя продуктивность' },
    { time: '11:00-13:00', score: 72, label: 'Хорошая продуктивность' },
    { time: '13:00-15:00', score: 45, label: 'Низкая продуктивность' },
    { time: '15:00-17:00', score: 95, label: 'Пик продуктивности' },
    { time: '17:00-19:00', score: 78, label: 'Высокая продуктивность' },
    { time: '19:00-21:00', score: 60, label: 'Средняя продуктивность' }
  ];
  const zonesToShow = focusZones.length ? focusZones : defaultFocusZones;

  const handleGeneratePlan = async () => {
    setIsAnalyzing(true);
    try {
      const plan = await aiAPI.generatePlan();
      if (plan) setProductivityAnalysis({
        bestTime: plan.bestTime || '14:00-16:00',
        bestDay: plan.bestDay || 'Четверг',
        avgSessionLength: plan.avgSessionLength ?? 35,
        focusScore: plan.focusScore ?? 70,
        recommendations: plan.recommendations || []
      });
      setAiSuggestions(Array.isArray(plan?.suggestions) ? plan.suggestions : []);
      setPlanGenerated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    setApplyingId(suggestion.id);
    setApplyMessage('');
    try {
      const subjects = await subjectsAPI.getAll();
      const findSubjectId = (name) => {
        const s = (subjects || []).find(
          sub => sub.name && sub.name.toLowerCase().includes((name || '').toLowerCase())
        );
        return s?.id || null;
      };

      if (suggestion.type === 'schedule' && suggestion.schedule) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        let createdCount = 0;
        for (const item of suggestion.schedule) {
          const [h, m] = (item.time || '09:00').split(':').map(Number);
          const scheduledAt = new Date(tomorrow);
          scheduledAt.setHours(h, m || 0, 0, 0);
          const intervals = Math.max(1, Math.round((item.duration || 25) / 25));
          const created = await sessionsAPI.create({
            goal: item.subject || 'Сессия',
            subject_id: findSubjectId(item.subject),
            work_interval: 25,
            short_break: 5,
            long_break: 15,
            intervals_count: intervals,
            scheduled_at: scheduledAt.toISOString()
          });
          if (created?.id) createdCount += 1;
        }
        if (createdCount === 0) {
          throw new Error('empty_result');
        }
        setApplyMessage(`Готово: создано сессий ${createdCount}.`);
        navigate('/sessions');
      } else if ((suggestion.type === 'reminder' || suggestion.type === 'goal') && suggestion.session) {
        const subjectName = suggestion.session.subject || 'Общее';
        const match = String(suggestion.session.time || '').match(/(\d{1,2}):(\d{2})/);
        const [h, m] = match ? [parseInt(match[1], 10), parseInt(match[2], 10)] : [14, 0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(h, m, 0, 0);
        const duration = Number(suggestion.session.duration || 25);
        const intervals = Math.max(1, Math.round(duration / 25));
        const created = await sessionsAPI.create({
          goal: suggestion.session.goal || `Сессия: ${subjectName}`,
          subject_id: findSubjectId(subjectName),
          work_interval: 25,
          short_break: 5,
          long_break: 15,
          intervals_count: intervals,
          scheduled_at: tomorrow.toISOString()
        });
        if (!created?.id) {
          throw new Error('empty_result');
        }
        setApplyMessage('Готово: сессия создана.');
        navigate('/sessions');
      } else {
        throw new Error('invalid_suggestion_payload');
      }
    } catch (e) {
      console.error(e);
      setApplyMessage('Не удалось применить это предложение: в данных от сервера не хватает параметров.');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className={`ai-planner-page ${isLoaded ? 'loaded' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
            <Home size={20} />
            <span>Главная</span>
          </button>
          <button className={`nav-item ${isActive('/subjects') ? 'active' : ''}`} onClick={() => navigate('/subjects')}>
            <BookOpen size={20} />
            <span>Предметы</span>
          </button>
          <button className={`nav-item ${isActive('/sessions') ? 'active' : ''}`} onClick={() => navigate('/sessions')}>
            <Calendar size={20} />
            <span>Сессии</span>
          </button>
          <button className={`nav-item ${isActive('/statistics') ? 'active' : ''}`} onClick={() => navigate('/statistics')}>
            <TrendingUp size={20} />
            <span>Статистика</span>
          </button>
          <button className={`nav-item ${isActive('/ai-planner') ? 'active' : ''}`} onClick={() => navigate('/ai-planner')}>
            <Sparkles size={20} />
            <span>AI Планировщик</span>
          </button>
          <button className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={20} />
            <span>Профиль</span>
          </button>
        </nav>
      </aside>

      <main className="ai-planner-main">
        <header className="ai-planner-header">
          <div>
            <h1 className="page-title">
              <Sparkles size={28} />
              AI Планировщик
            </h1>
            <p className="page-subtitle">
              Умный помощник анализирует твою продуктивность и создает оптимальный план учебы
            </p>
          </div>
          <button 
            className="btn-generate-plan"
            onClick={handleGeneratePlan}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Brain size={18} className="spinning" />
                Анализирую...
              </>
            ) : (
              <>
                <Zap size={18} />
                Создать план
              </>
            )}
          </button>
        </header>

        {/* Productivity Analysis */}
        <section className="analysis-section">
          <div className="analysis-card">
            <div className="analysis-header">
              <Brain size={24} className="ai-icon" />
              <h2 className="analysis-title">Анализ продуктивности</h2>
            </div>
            <div className="analysis-grid">
              <div className="analysis-item">
                <div className="analysis-label">Лучшее время</div>
                <div className="analysis-value">{productivityAnalysis.bestTime}</div>
                <div className="analysis-badge">Пик фокуса</div>
              </div>
              <div className="analysis-item">
                <div className="analysis-label">Лучший день</div>
                <div className="analysis-value">{productivityAnalysis.bestDay}</div>
                <div className="analysis-badge">Высокая активность</div>
              </div>
              <div className="analysis-item">
                <div className="analysis-label">Средняя сессия</div>
                <div className="analysis-value">{productivityAnalysis.avgSessionLength} мин</div>
                <div className="analysis-badge">Оптимально</div>
              </div>
              <div className="analysis-item">
                <div className="analysis-label">Фокус-скор</div>
                <div className="analysis-value">{productivityAnalysis.focusScore}%</div>
                <div className="analysis-badge excellent">Отлично</div>
              </div>
            </div>
            <div className="recommendations">
              <h3 className="recommendations-title">
                <Lightbulb size={18} />
                Рекомендации AI
              </h3>
              <ul className="recommendations-list">
                {productivityAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">
                    <CheckCircle2 size={16} />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Focus Zones */}
        <section className="focus-zones-section">
          <h2 className="section-title">Зоны продуктивности</h2>
          <div className="focus-zones-card">
            <div className="zones-grid">
              {zonesToShow.map((zone, index) => (
                <div key={zone.time || index} className="zone-item">
                  <div className="zone-time">{zone.time}</div>
                  <div className="zone-bar-wrapper">
                    <div 
                      className="zone-bar"
                      style={{ 
                        width: `${zone.score}%`,
                        background: zone.score >= 80 ? '#22c55e' : zone.score >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <div className="zone-score">{zone.score}%</div>
                  <div className="zone-label">{zone.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Suggestions */}
        {planGenerated && (
          <section className="suggestions-section">
            <h2 className="section-title">
              <Sparkles size={20} />
              Умные предложения
            </h2>
            <div className="suggestions-grid">
              {aiSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-card">
                  <div className="suggestion-header">
                    <div className="suggestion-type-badge">
                      {suggestion.type === 'schedule' && <Calendar size={16} />}
                      {suggestion.type === 'goal' && <Target size={16} />}
                      {suggestion.type === 'reminder' && <AlertCircle size={16} />}
                    </div>
                    <div className="confidence-badge">
                      {suggestion.confidence}% уверен
                    </div>
                  </div>
                  <h3 className="suggestion-title">{suggestion.title}</h3>
                  <p className="suggestion-description">{suggestion.description}</p>
                  
                  {suggestion.type === 'schedule' && (
                    <div className="schedule-list">
                      {suggestion.schedule.map((item, idx) => (
                        <div key={idx} className="schedule-item">
                          <div className="schedule-time">{item.time}</div>
                          <div className="schedule-content">
                            <div className="schedule-subject">{item.subject}</div>
                            <div className="schedule-meta">
                              <Clock size={12} />
                              {item.duration} мин
                            </div>
                          </div>
                          <div className={`priority-badge ${item.priority}`}>
                            {item.priority === 'high' ? 'Важно' : 'Средне'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {suggestion.type === 'goal' && (
                    <div className="steps-list">
                      {suggestion.steps.map((step, idx) => (
                        <div key={idx} className="step-item">
                          <div className={`step-checkbox ${step.completed ? 'completed' : ''}`}>
                            {step.completed ? <CheckCircle2 size={16} /> : <div className="circle" />}
                          </div>
                          <span>{step.step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {suggestion.type === 'reminder' && (
                    <div className="reminder-content">
                      <p>{suggestion.session?.goal || suggestion.description}</p>
                    </div>
                  )}

                  <button 
                    className="btn-accept-suggestion"
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    disabled={applyingId === suggestion.id || !suggestion?.type}
                  >
                    {applyingId === suggestion.id ? (
                      <>Применяю...</>
                    ) : (
                      <>
                        <Play size={16} />
                        Применить
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
            {aiSuggestions.length === 0 && (
              <div style={{ marginTop: '0.75rem', color: '#6b7280' }}>
                AI пока не вернул применимые предложения. Нажми "Создать план" ещё раз.
              </div>
            )}
            {applyMessage && (
              <div style={{ marginTop: '0.75rem', color: '#374151', fontWeight: 500 }}>
                {applyMessage}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AIPlannerPage;

