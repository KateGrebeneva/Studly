import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, MessageSquare, Clock, Target, Flame, Send, Sparkles, Home, Plus, Sun } from 'lucide-react';
import { sessionsAPI, aiAPI, statsAPI } from '../services/api';
import { Mascot, Spots, formatMinutes, plural, toLocalDateKey } from './ui';
import './SessionCompletePage.css';

const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const SessionCompletePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const intervals = parseInt(searchParams.get('intervals') || '1', 10);

  const [activeTab, setActiveTab] = useState('analytics');
  const [sessionData, setSessionData] = useState({ goal: '', subject_name: '', subject_color: '', work_interval: 25, duration_minutes: 0 });
  const [today, setToday] = useState(null);
  const [week, setWeek] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'ai', text: 'Сессия позади! Нажми «Сгенерировать тест» — составлю вопросы по теме, чтобы она лучше запомнилась.' },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (sessionId) {
          const sess = await sessionsAPI.getById(sessionId);
          setSessionData({
            goal: sess.goal || '',
            subject_name: sess.subject_name || '',
            subject_color: sess.subject_color || '',
            work_interval: sess.work_interval || 25,
            duration_minutes: sess.duration_minutes || 0,
          });
        }
      } catch { /* сессия могла быть удалена */ }
      try {
        const [dash, weekly] = await Promise.all([statsAPI.getDashboard(), statsAPI.getWeekly()]);
        setToday(dash);
        const map = new Map((weekly || []).map((w) => [toLocalDateKey(w.date), Number(w.time || 0)]));
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          days.push({ day: DAY_SHORT[d.getDay()], time: map.get(toLocalDateKey(d)) || 0, isToday: i === 0 });
        }
        setWeek(days);
      } catch { /* статистика недоступна */ }
    };
    load();
  }, [sessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chatMessages, isGenerating]);

  const parseQ = (res) => (Array.isArray(res?.questions)
    ? (res.questionsText || res.questions.map((x, i) => `${i + 1}. ${x}`).join('\n'))
    : (res?.questionsText || res?.questions || ''));

  const handleLoadReinforcement = async () => {
    const goal = sessionData.goal || inputMessage.trim() || 'изученный материал';
    setIsGenerating(true);
    try {
      const res = await aiAPI.generateTest(goal, sessionData.subject_name);
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: parseQ(res) || 'Не получилось составить вопросы. Напиши тему ниже.' }]);
    } catch {
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: 'AI сейчас недоступен. Напиши тему и отправь ещё раз.' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;
    const text = inputMessage;
    setChatMessages((prev) => [...prev, { id: Date.now(), type: 'user', text }]);
    setInputMessage('');
    setIsGenerating(true);
    try {
      const res = await aiAPI.generateTest(text, sessionData.subject_name);
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: parseQ(res) || 'Попробуй уточнить тему.' }]);
    } catch {
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: 'Не удалось получить ответ. Попробуй ещё раз.' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const focusMinutes = sessionData.duration_minutes || intervals * (sessionData.work_interval || 25);
  const maxDay = Math.max(30, ...week.map((d) => d.time));
  const hasTest = chatMessages.some((m) => m.type === 'ai' && /\d\./.test(m.text));

  return (
    <div className="sc">
      <div className="sc-container">
        <section className="sc-hero panel-violet rise">
          <Spots set="a" opacity={0.1} />
          <div className="sc-hero-text">
            <p className="sc-kicker">Сессия завершена</p>
            <h1 className="sc-title">Отличная работа!</h1>
            {sessionData.goal && (
              <p className="sc-goal">
                {sessionData.subject_name && <span className="sc-subj" style={{ '--c': sessionData.subject_color || '#fff' }}>{sessionData.subject_name}</span>}
                {sessionData.goal}
              </p>
            )}
          </div>
          <Mascot variant="bust" pose="jump" mood="cheer" className="sc-mascot" cycle={['jump', 'thumbs', 'wave', 'playful']} />
        </section>

        <div className="sc-tabs rise rise-1">
          <div className="segmented" role="tablist" aria-label="Итоги">
            <button type="button" role="tab" aria-selected={activeTab === 'analytics'} className={activeTab === 'analytics' ? 'is-active' : ''} onClick={() => setActiveTab('analytics')}>
              <BarChart3 size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Итоги
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'reinforcement'} className={activeTab === 'reinforcement' ? 'is-active' : ''} onClick={() => setActiveTab('reinforcement')}>
              <MessageSquare size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Закрепление
            </button>
          </div>
        </div>

        {activeTab === 'analytics' && (
          <div className="sc-analytics rise rise-2">
            <div className="sc-stats">
              <div className="sc-stat" style={{ '--c': 'var(--violet-500)' }}>
                <Clock size={20} /><b className="t-num">{formatMinutes(focusMinutes)}</b><span>фокуса в этой сессии</span>
              </div>
              <div className="sc-stat" style={{ '--c': 'var(--denim-500)' }}>
                <Target size={20} /><b className="t-num">{intervals}</b><span>{plural(intervals, 'интервал', 'интервала', 'интервалов')}</span>
              </div>
              <div className="sc-stat" style={{ '--c': 'var(--mint-500)' }}>
                <Sun size={20} /><b className="t-num">{today ? formatMinutes(today.timeStudied) : '—'}</b><span>учёбы за сегодня</span>
              </div>
              <div className="sc-stat" style={{ '--c': 'var(--sun-500)' }}>
                <Flame size={20} /><b className="t-num">{today ? `${today.streak} ${plural(today.streak, 'день', 'дня', 'дней')}` : '—'}</b><span>серия</span>
              </div>
            </div>

            {week.length > 0 && (
              <div className="card card-pad sc-week">
                <h2 className="t-h2">Твоя неделя</h2>
                <div className="sc-bars">
                  {week.map((d, i) => (
                    <div key={i} className={`sc-bar ${d.isToday ? 'is-today' : ''}`}>
                      <span className="sc-bar-val t-num">{d.time || ''}</span>
                      <span className="sc-bar-track"><span style={{ height: `${d.time ? Math.max(6, (d.time / maxDay) * 100) : 0}%` }} /></span>
                      <span className="sc-bar-day">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="button" className="sc-nudge" onClick={() => setActiveTab('reinforcement')}>
              <Sparkles size={20} />
              <span><b>Закрепи тему за 3 минуты.</b> AI составит вопросы по «{sessionData.goal || 'изученному материалу'}».</span>
            </button>
          </div>
        )}

        {activeTab === 'reinforcement' && (
          <div className="card card-pad sc-chat rise rise-2">
            {!hasTest && (
              <button type="button" className="btn btn-primary sc-gen" onClick={handleLoadReinforcement} disabled={isGenerating}>
                <Sparkles size={18} /> {isGenerating ? 'Составляю вопросы…' : 'Сгенерировать тест по теме сессии'}
              </button>
            )}
            <div className="ai-chat">
              <div className="ai-chat-log" aria-live="polite">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`ai-msg ai-msg-${m.type}`}>
                    {m.type === 'ai' && <Mascot variant="avatar" className="ai-msg-avatar" decorative />}
                    <p>{m.text}</p>
                  </div>
                ))}
                {isGenerating && (
                  <div className="ai-msg ai-msg-ai">
                    <Mascot variant="avatar" className="ai-msg-avatar" decorative />
                    <p className="ai-typing"><span /><span /><span /></p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form className="ai-chat-form" onSubmit={handleSendMessage}>
                <input className="input" placeholder="Напиши тему, которую изучал…" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} disabled={isGenerating} aria-label="Тема для теста" />
                <button type="submit" className="btn btn-primary btn-icon" disabled={isGenerating || !inputMessage.trim()} aria-label="Отправить"><Send size={18} /></button>
              </form>
            </div>
          </div>
        )}

        <div className="sc-actions rise rise-3">
          <button type="button" className="btn btn-lg" onClick={() => navigate('/sessions')}><Plus size={18} /> Новая сессия</button>
          <button type="button" className="btn btn-ink btn-lg" onClick={() => navigate('/dashboard')}><Home size={18} /> На главную</button>
        </div>
      </div>
    </div>
  );
};

export default SessionCompletePage;
