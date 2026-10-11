import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Clock, Target, AlertCircle, CheckCircle2, ArrowRight, Lightbulb, Wand2, RefreshCw, Sun } from 'lucide-react';
import { aiAPI, activityZonesAPI, sessionsAPI, subjectsAPI } from '../services/api';
import AppLayout from './AppLayout';
import { PageHeader, Mascot, Spots } from './ui';
import './AIPlannerPage.css';

const TYPE_META = {
  schedule: { label: 'Расписание', icon: Calendar, badge: 'badge-violet' },
  goal: { label: 'Цель', icon: Target, badge: 'badge-mint' },
  reminder: { label: 'Напоминание', icon: AlertCircle, badge: 'badge-sun' },
};

const AIPlannerPage = () => {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [planError, setPlanError] = useState('');
  const [productivityAnalysis, setProductivityAnalysis] = useState(null);
  const [focusZones, setFocusZones] = useState([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const zones = await activityZonesAPI.getAll();
        const seen = new Set();
        setFocusZones((zones || [])
          .map((z) => ({ time: z.time, score: z.score, label: z.label }))
          .filter((z) => { if (seen.has(z.time)) return false; seen.add(z.time); return true; }));
      } catch (e) {
        console.error(e);
      } finally {
        setZonesLoaded(true);
      }
    };
    load();
  }, []);

  const handleGeneratePlan = async () => {
    setIsAnalyzing(true);
    setPlanError('');
    setApplyMessage('');
    try {
      const plan = await aiAPI.generatePlan();
      if (plan) {
        setProductivityAnalysis({
          bestTime: plan.bestTime || '—',
          bestDay: plan.bestDay || '—',
          avgSessionLength: plan.avgSessionLength ?? null,
          focusScore: plan.focusScore ?? null,
          recommendations: plan.recommendations || [],
        });
      }
      setAiSuggestions(Array.isArray(plan?.suggestions) ? plan.suggestions : []);
      setPlanGenerated(true);
    } catch (e) {
      console.error(e);
      setPlanError('AI не ответил. Проверь, что сервер запущен и ключ AI настроен, и попробуй ещё раз.');
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
        const s = (subjects || []).find((sub) => sub.name && sub.name.toLowerCase().includes((name || '').toLowerCase()));
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
          // eslint-disable-next-line no-await-in-loop
          const created = await sessionsAPI.create({
            goal: item.subject || 'Сессия',
            subject_id: findSubjectId(item.subject),
            work_interval: 25,
            short_break: 5,
            long_break: 15,
            intervals_count: intervals,
            scheduled_at: scheduledAt.toISOString(),
          });
          if (created?.id) createdCount += 1;
        }
        if (createdCount === 0) throw new Error('empty_result');
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
          scheduled_at: tomorrow.toISOString(),
        });
        if (!created?.id) throw new Error('empty_result');
        setApplyMessage('Готово: сессия создана.');
        navigate('/sessions');
      } else {
        throw new Error('invalid_suggestion_payload');
      }
    } catch (e) {
      console.error(e);
      setApplyMessage('Не удалось применить это предложение: в ответе AI не хватает данных. Попробуй создать план заново.');
    } finally {
      setApplyingId(null);
    }
  };

  const peak = focusZones.reduce((b, z) => (z.score > (b?.score || 0) ? z : b), null);
  const a = productivityAnalysis;

  return (
    <AppLayout>
      <PageHeader
        title="AI-планировщик"
        subtitle="Помощник смотрит на твою историю занятий и предлагает, когда и чем заниматься"
        actions={planGenerated && (
          <button type="button" className="btn" onClick={handleGeneratePlan} disabled={isAnalyzing}>
            <RefreshCw size={17} className={isAnalyzing ? 'spin' : ''} /> Обновить план
          </button>
        )}
      />

      {/* вступление */}
      {!planGenerated && (
        <section className="ai-intro panel-violet rise">
          <Spots set="a" opacity={0.08} />
          <div className="ai-intro-text">
            <h2 className="ai-intro-title">Собрать план на завтра?</h2>
            <p>AI проанализирует, в какие часы и дни ты занимаешься продуктивнее, и предложит расписание, цели и напоминания. Понравившееся добавляется в сессии одной кнопкой.</p>
            <button type="button" className="btn btn-ink btn-lg" onClick={handleGeneratePlan} disabled={isAnalyzing}>
              {isAnalyzing ? <><RefreshCw size={18} className="spin" /> Анализирую…</> : <><Wand2 size={18} /> Создать план</>}
            </button>
            {planError && <p className="ai-intro-error" role="alert">{planError}</p>}
          </div>
          <Mascot variant="bust" pose={planError ? 'grumpy' : 'shy'} mood="think" className="ai-intro-mascot" decorative />
        </section>
      )}

      {planGenerated && a && (
        <section className="ai-analysis rise">
          <div className="ai-kpis">
            <div className="ai-kpi"><Clock size={18} /><span>Лучшее время</span><b>{a.bestTime}</b></div>
            <div className="ai-kpi"><Calendar size={18} /><span>Лучший день</span><b>{a.bestDay}</b></div>
            <div className="ai-kpi"><Target size={18} /><span>Средняя сессия</span><b>{a.avgSessionLength != null ? `${a.avgSessionLength} мин` : '—'}</b></div>
            <div className="ai-kpi ai-kpi-score">
              <Sparkles size={18} /><span>Фокус-скор</span>
              <b>{a.focusScore != null ? `${a.focusScore}%` : '—'}</b>
              {a.focusScore != null && <div className="progress"><span style={{ width: `${a.focusScore}%` }} /></div>}
            </div>
          </div>
          {a.recommendations.length > 0 && (
            <div className="ai-recs card card-pad">
              <div className="ai-recs-head">
                <Mascot variant="head" mood="idle" className="ai-recs-mascot" decorative />
                <h2 className="t-h2"><Lightbulb size={18} /> Советы на основе твоих занятий</h2>
              </div>
              <ul>
                {a.recommendations.map((rec, i) => <li key={i}><CheckCircle2 size={17} /><span>{rec}</span></li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {planGenerated && (
        <section className="ai-section">
          <h2 className="t-h2 ai-section-title"><Sparkles size={20} /> Предложения</h2>
          {applyMessage && <div className={`alert ${applyMessage.startsWith('Готово') ? 'alert-success' : 'alert-error'}`} role="status" style={{ marginBottom: '1rem' }}>{applyMessage}</div>}
          {aiSuggestions.length === 0 ? (
            <div className="empty">
              <Mascot variant="full" pose="shy" mood="think" style={{ width: 80 }} decorative />
              <div>
                <h3>AI пока не предложил ничего конкретного</h3>
                <p>Так бывает, когда истории занятий мало. Заверши пару сессий и попробуй снова.</p>
                <div className="empty-actions"><button type="button" className="btn btn-primary btn-sm" onClick={handleGeneratePlan} disabled={isAnalyzing}><RefreshCw size={16} /> Попробовать ещё раз</button></div>
              </div>
            </div>
          ) : (
            <div className="ai-sugs">
              {aiSuggestions.map((s, i) => {
                const meta = TYPE_META[s.type] || { label: 'Совет', icon: Lightbulb, badge: 'badge' };
                const Icon = meta.icon;
                return (
                  <article key={s.id} className={`ai-sug rise rise-${Math.min(i + 1, 6)}`}>
                    <div className="ai-sug-top">
                      <span className={`badge ${meta.badge}`}><Icon size={13} /> {meta.label}</span>
                      {s.confidence != null && (
                        <span className="ai-conf" title="Уверенность AI">
                          <span className="ai-conf-bar"><span style={{ width: `${s.confidence}%` }} /></span>
                          <small className="t-num">{s.confidence}%</small>
                        </span>
                      )}
                    </div>
                    <h3>{s.title}</h3>
                    {s.description && <p className="ai-sug-desc">{s.description}</p>}

                    {s.type === 'schedule' && Array.isArray(s.schedule) && (
                      <ol className="ai-sched">
                        {s.schedule.map((item, idx) => (
                          <li key={idx}>
                            <b className="t-num">{item.time}</b>
                            <span>{item.subject}</span>
                            <small>{item.duration} мин</small>
                            <i className={item.priority === 'high' ? 'hi' : ''} title={item.priority === 'high' ? 'Важно' : 'Обычный приоритет'} />
                          </li>
                        ))}
                      </ol>
                    )}
                    {s.type === 'goal' && Array.isArray(s.steps) && (
                      <ul className="ai-steps">
                        {s.steps.map((st, idx) => (
                          <li key={idx} className={st.completed ? 'is-done' : ''}>
                            <span className="ai-step-box">{st.completed && <CheckCircle2 size={14} />}</span>
                            {st.step}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.type === 'reminder' && <p className="ai-reminder">{s.session?.goal || s.description}</p>}

                    <button type="button" className="btn btn-primary btn-sm ai-apply" onClick={() => handleAcceptSuggestion(s)} disabled={applyingId === s.id || !s?.type}>
                      {applyingId === s.id ? <><RefreshCw size={15} className="spin" /> Применяю…</> : <>Добавить в сессии <ArrowRight size={15} /></>}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* зоны фокуса */}
      <section className="ai-section">
        <h2 className="t-h2 ai-section-title"><Sun size={20} /> Зоны продуктивности сегодня</h2>
        {!zonesLoaded ? (
          <div className="skeleton" style={{ height: 160 }} />
        ) : focusZones.length === 0 ? (
          <div className="empty">
            <Mascot variant="full" pose="lying" mood="sleep" style={{ width: 130 }} decorative />
            <div>
              <h3>Данных о фокусе за сегодня пока нет</h3>
              <p>Зоны появятся, когда накопится история сессий. Начни с одной — и Спот начнёт замечать твой ритм.</p>
              <div className="empty-actions"><button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/sessions')}>К сессиям</button></div>
            </div>
          </div>
        ) : (
          <div className="card card-pad ai-zones">
            <div className="ai-zone-chart" role="img" aria-label={focusZones.map((z) => `${z.time}: ${z.score}%`).join(', ')}>
              {focusZones.map((z) => (
                <div key={z.time} className={`ai-zone ${peak && z.time === peak.time ? 'is-peak' : ''}`} style={{ '--h': `${z.score}%`, '--c': z.score >= 80 ? 'var(--mint-500)' : z.score >= 60 ? 'var(--violet-400)' : 'var(--rose-500)' }}>
                  <span className="ai-zone-score t-num">{z.score}%</span>
                  <span className="ai-zone-col"><span /></span>
                  <span className="ai-zone-time t-num">{z.time}</span>
                  <span className="ai-zone-label">{z.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default AIPlannerPage;
