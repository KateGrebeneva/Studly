import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Pause, Square, RotateCcw, ArrowLeft, BarChart3, Sparkles, Send, Clock, CheckCircle2 } from 'lucide-react';
import { sessionsAPI, aiAPI } from '../services/api';
import { playChime } from '../utils/chime';
import { Mascot, Modal, Logo, formatMinutes } from './ui';
import './PomodoroTimer.css';

const PomodoroTimer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(1);
  const [totalIntervals, setTotalIntervals] = useState(4);
  const [isBreak, setIsBreak] = useState(false);
  const [workTime, setWorkTime] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({ goal: '', subject_name: '', subject_color: '' });

  const intervalRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const sess = await sessionsAPI.getById(sessionId);
        setSessionInfo({ goal: sess.goal || '', subject_name: sess.subject_name || '', subject_color: sess.subject_color || '' });
        const wi = sess.work_interval || 25;
        setWorkTime(wi);
        setBreakTime(sess.short_break || 5);
        setTotalIntervals(sess.intervals_count || 4);
        setTimeLeft(wi * 60);
      } catch {
        const savedSettings = localStorage.getItem(`session_${sessionId}`);
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setWorkTime(settings.workInterval || 25);
          setBreakTime(settings.shortBreak || 5);
          setTotalIntervals(settings.intervalsCount || 4);
          setTimeLeft((settings.workInterval || 25) * 60);
        }
      }
    };
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleIntervalComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft]);

  // показываем таймер в заголовке вкладки
  useEffect(() => {
    const prev = document.title;
    return () => { document.title = prev.includes('·') ? 'Studly — учись в своём ритме' : prev; };
  }, []);
  useEffect(() => {
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');
    document.title = isRunning ? `${mm}:${ss} · ${isBreak ? 'Перерыв' : 'Фокус'} — Studly` : 'Studly — учись в своём ритме';
  }, [timeLeft, isRunning, isBreak]);

  const handleIntervalComplete = () => {
    playChime();
    if (!isBreak) {
      setCompletedIntervals((prev) => prev + 1);
      if (completedIntervals + 1 < totalIntervals) {
        setIsBreak(true);
        setTimeLeft(breakTime * 60);
        setCurrentInterval((prev) => prev + 1);
      } else {
        handleSessionComplete();
      }
    } else {
      setIsBreak(false);
      setTimeLeft(workTime * 60);
    }
    setIsRunning(false);
  };

  const handleSessionComplete = async () => {
    const intervals = totalIntervals;
    try {
      await sessionsAPI.update(sessionId, { status: 'completed', completed_at: new Date().toISOString() });
    } catch (e) {
      console.error(e);
    }
    navigate(`/session-complete?session=${sessionId}&intervals=${intervals}`);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => { setIsRunning(true); setIsPaused(false); };
  const handlePause = () => { setIsRunning(false); setIsPaused(true); };
  const handleReset = () => { setIsRunning(false); setIsPaused(false); setTimeLeft(isBreak ? breakTime * 60 : workTime * 60); };

  const handleStop = async () => {
    setIsRunning(false);
    setShowCompleteModal(true);
    if (sessionId && completedIntervals > 0) {
      try {
        await sessionsAPI.update(sessionId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_minutes: completedIntervals * workTime,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const parseQuestions = (res) => (Array.isArray(res?.questions)
    ? (res.questionsText || res.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'))
    : (res?.questionsText || res?.questions || ''));

  const handlePinSession = async () => {
    setShowCompleteModal(false);
    setShowAIChat(true);
    const goal = sessionInfo.goal || 'изученный материал';
    setAiMessages([{ id: Date.now(), type: 'ai', text: `Составляю вопросы для закрепления по теме «${goal}»…` }]);
    setIsAIGenerating(true);
    try {
      const res = await aiAPI.generateTest(goal, sessionInfo.subject_name);
      const q = parseQuestions(res);
      setAiMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: q || 'Не получилось составить вопросы. Напиши тему ниже — попробую ещё раз.' }]);
    } catch {
      setAiMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: 'AI сейчас недоступен. Напиши тему вручную, и я попробую снова.' }]);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleSendAIMessage = async (e) => {
    e?.preventDefault();
    if (!aiInput.trim() || isAIGenerating) return;
    const text = aiInput;
    setAiMessages((prev) => [...prev, { id: Date.now(), type: 'user', text }]);
    setAiInput('');
    setIsAIGenerating(true);
    try {
      const res = await aiAPI.generateTest(text, sessionInfo.subject_name);
      setAiMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: parseQuestions(res) || 'Попробуй сформулировать тему точнее.' }]);
    } catch {
      setAiMessages((prev) => [...prev, { id: Date.now() + 1, type: 'ai', text: 'Не удалось получить ответ. Попробуй ещё раз.' }]);
    } finally {
      setIsAIGenerating(false);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [aiMessages, isAIGenerating]);

  const phaseTotal = (isBreak ? breakTime : workTime) * 60;
  const progress = ((phaseTotal - timeLeft) / phaseTotal) * 100;
  const R = 46;
  const C = 2 * Math.PI * R;
  const remaining = Math.max(0, totalIntervals - completedIntervals - (isBreak ? 0 : 1));
  const accent = sessionInfo.subject_color || undefined;
  const mood = isBreak ? 'sleep' : isRunning ? 'focus' : 'idle';
  const pose = isBreak ? 'lying' : isRunning ? 'sit' : isPaused ? 'shy' : 'wave';
  const bubble = isBreak
    ? 'Перерыв! Встань, потянись, выпей воды.'
    : isRunning ? null
      : isPaused ? 'Пауза. Продолжим, когда будешь готов.' : 'Убери телефон — и поехали.';

  return (
    <div className={`pm ${isBreak ? 'is-break' : 'is-work'} ${isRunning ? 'is-running' : ''}`} style={accent ? { '--subject': accent } : undefined}>
      <header className="pm-top">
        <button type="button" className="btn btn-on-panel btn-sm" onClick={() => navigate('/sessions')}>
          <ArrowLeft size={16} /> К сессиям
        </button>
        <Logo size={28} className="pm-logo" />
        <span className="pm-phase">{isBreak ? 'Перерыв' : 'Фокус'} · {currentInterval}/{totalIntervals}</span>
      </header>

      <main className="pm-main">
        <div className="pm-goal">
          {sessionInfo.subject_name && <span className="pm-subject">{sessionInfo.subject_name}</span>}
          <h1>{sessionInfo.goal || 'Сессия фокуса'}</h1>
        </div>

        <div className="pm-dial" role="timer" aria-live="off" aria-label={`Осталось ${formatTime(timeLeft)}`}>
          <svg viewBox="0 0 100 100" className="pm-ring" aria-hidden="true">
            <circle cx="50" cy="50" r={R} className="pm-ring-trk" />
            <circle cx="50" cy="50" r={R} className="pm-ring-val" strokeDasharray={C} strokeDashoffset={C * (1 - progress / 100)} transform="rotate(-90 50 50)" />
            {Array.from({ length: 60 }).map((_, i) => (
              <line key={i} x1="50" y1="9.5" x2="50" y2={i % 5 === 0 ? 12.5 : 11} className="pm-tick" transform={`rotate(${i * 6} 50 50)`} />
            ))}
          </svg>
          <div className="pm-dial-center">
            <span className="pm-time t-num">{formatTime(timeLeft)}</span>
            <span className="pm-dial-label">{isBreak ? `перерыв ${breakTime} мин` : `интервал ${workTime} мин`}</span>
          </div>
        </div>

        <div className="pm-dots" aria-label={`Завершено интервалов: ${completedIntervals} из ${totalIntervals}`}>
          {Array.from({ length: totalIntervals }).map((_, i) => (
            <i key={i} className={i < completedIntervals ? 'done' : (i === completedIntervals && !isBreak ? 'now' : '')} />
          ))}
        </div>

        <div className="pm-controls">
          <button type="button" className="pm-btn-side" onClick={handleReset} aria-label="Сбросить интервал">
            <RotateCcw size={22} />
            <span>Сброс</span>
          </button>
          {isRunning ? (
            <button type="button" className="pm-btn-main" onClick={handlePause} aria-label="Пауза"><Pause size={34} /></button>
          ) : (
            <button type="button" className="pm-btn-main" onClick={handleStart} aria-label={isPaused ? 'Продолжить' : 'Начать'}><Play size={34} className="pm-play" /></button>
          )}
          <button type="button" className="pm-btn-side" onClick={handleStop} aria-label="Завершить сессию">
            <Square size={20} />
            <span>Завершить</span>
          </button>
        </div>

        <p className="pm-status">
          {isRunning ? (isBreak ? 'Отдыхаем' : 'Идёт фокус') : isPaused ? 'На паузе' : 'Готов начать'} · осталось {remaining} {remaining === 1 ? 'интервал' : 'интервала'}
        </p>
      </main>

      <div className="pm-mascot">
        <Mascot variant="bust" pose={pose} mood={mood} bubble={bubble} bubblePosition="left" decorative />
      </div>

      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)}>
        <div className="pm-done">
          <Mascot variant="full" pose={completedIntervals > 0 ? 'jump' : 'shy'} mood={completedIntervals > 0 ? 'cheer' : 'idle'} className="pm-done-mascot" decorative />
          <h2 className="pm-done-title">{completedIntervals > 0 ? 'Сессия завершена!' : 'Сессия остановлена'}</h2>
          <p className="t-muted">{completedIntervals > 0 ? 'Хорошая работа. Время сохранено в статистике.' : 'Ни один интервал не был завершён, поэтому время не засчитано.'}</p>
          <div className="pm-done-stats">
            <div><CheckCircle2 size={18} /><b className="t-num">{completedIntervals}</b><span>интервалов</span></div>
            <div><Clock size={18} /><b className="t-num">{formatMinutes(completedIntervals * workTime)}</b><span>фокуса</span></div>
          </div>
          <div className="pm-done-actions">
            <button type="button" className="btn" onClick={() => { setShowCompleteModal(false); navigate('/statistics'); }}><BarChart3 size={18} /> Статистика</button>
            <button type="button" className="btn btn-primary" onClick={handlePinSession}><Sparkles size={18} /> Закрепить с AI</button>
          </div>
        </div>
      </Modal>

      <Modal open={showAIChat} onClose={() => setShowAIChat(false)} title="Закрепление с AI" icon={Sparkles} subtitle="Ответь на вопросы — так тема запомнится лучше">
        <div className="ai-chat">
          <div className="ai-chat-log" aria-live="polite">
            {aiMessages.map((m) => (
              <div key={m.id} className={`ai-msg ai-msg-${m.type}`}>
                {m.type === 'ai' && <Mascot variant="avatar" mood="idle" className="ai-msg-avatar" decorative />}
                <p>{m.text}</p>
              </div>
            ))}
            {isAIGenerating && (
              <div className="ai-msg ai-msg-ai">
                <Mascot variant="avatar" mood="think" className="ai-msg-avatar" decorative />
                <p className="ai-typing"><span /><span /><span /></p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form className="ai-chat-form" onSubmit={handleSendAIMessage}>
            <input className="input" placeholder="Тема или вопрос…" value={aiInput} onChange={(e) => setAiInput(e.target.value)} disabled={isAIGenerating} aria-label="Сообщение для AI" />
            <button type="submit" className="btn btn-primary btn-icon" disabled={isAIGenerating || !aiInput.trim()} aria-label="Отправить"><Send size={18} /></button>
          </form>
          <div className="ai-chat-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>На главную</button>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/sessions')}>Новая сессия</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PomodoroTimer;
