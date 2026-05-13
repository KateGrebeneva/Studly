import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Pause, Square, RotateCcw, CheckCircle, X, TrendingUp, Sparkles, Send, Brain, Clock } from 'lucide-react';
import { sessionsAPI, aiAPI } from '../services/api';
import './PomodoroTimer.css';

const PomodoroTimer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 минут в секундах
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
  const [sessionInfo, setSessionInfo] = useState({ goal: '', subject_name: '' });
  
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setIsLoaded(true);
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const sess = await sessionsAPI.getById(sessionId);
        setSessionInfo({ goal: sess.goal || '', subject_name: sess.subject_name || '' });
        const wi = sess.work_interval || 25;
        const sb = sess.short_break || 5;
        const ic = sess.intervals_count || 4;
        setWorkTime(wi);
        setBreakTime(sb);
        setTotalIntervals(ic);
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
        setTimeLeft(prev => {
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
  }, [isRunning, timeLeft]);

  const handleIntervalComplete = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    if (!isBreak) {
      // Завершили рабочий интервал
      setCompletedIntervals(prev => prev + 1);
      if (completedIntervals + 1 < totalIntervals) {
        // Переходим на перерыв
        setIsBreak(true);
        setTimeLeft(breakTime * 60);
        setCurrentInterval(prev => prev + 1);
      } else {
        // Все интервалы завершены
        handleSessionComplete();
      }
    } else {
      // Завершили перерыв
      setIsBreak(false);
      setTimeLeft(workTime * 60);
    }
    setIsRunning(false);
  };

  const handleSessionComplete = async () => {
    const intervals = totalIntervals;
    try {
      await sessionsAPI.update(sessionId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
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

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(isBreak ? breakTime * 60 : workTime * 60);
  };

  const handleStop = async () => {
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

  const handleViewStats = () => {
    setShowCompleteModal(false);
    navigate('/statistics');
  };

  const handlePinSession = async () => {
    setShowCompleteModal(false);
    setShowAIChat(true);
    const goal = sessionInfo.goal || 'изученный материал';
    setAiMessages([{
      id: Date.now(),
      type: 'ai',
      text: `Сейчас сгенерирую вопросы для закрепления по теме "${goal}"...`
    }]);
    setIsAIGenerating(true);
    try {
      const res = await aiAPI.generateTest(goal, sessionInfo.subject_name);
      const questions = res?.questions || '';
      setAiMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: questions || 'Не удалось сгенерировать. Напиши тему вручную ниже.'
      }]);
    } catch {
      setAiMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: 'Ошибка загрузки. Напиши тему вручную, и я сгенерирую вопросы.'
      }]);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleSendAIMessage = async () => {
    if (!aiInput.trim() || isAIGenerating) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: aiInput
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAIGenerating(true);

    try {
      const res = await aiAPI.generateTest(aiInput, sessionInfo.subject_name);
      const questions = res?.questions || '';
      setAiMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: questions || 'Попробуй уточнить тему.'
      }]);
    } catch {
      setAiMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: 'Ошибка. Попробуй ещё раз.'
      }]);
    } finally {
      setIsAIGenerating(false);
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages]);

  const progress = ((isBreak ? breakTime * 60 : workTime * 60) - timeLeft) / (isBreak ? breakTime * 60 : workTime * 60) * 100;

  return (
    <div className={`pomodoro-page ${isLoaded ? 'loaded' : ''}`}>
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      <div className="pomodoro-container">
        <div className="pomodoro-header">
          <button className="btn-back" onClick={() => navigate('/sessions')}>
            ← Назад
          </button>
          <div className="session-info">
            <span className="session-type">{isBreak ? 'Перерыв' : 'Работа'}</span>
            <span className="interval-counter">
              Интервал {currentInterval} из {totalIntervals}
            </span>
          </div>
        </div>

        <div className="pomodoro-timer-wrapper">
          <div className="timer-circle">
            <svg className="timer-svg" viewBox="0 0 100 100">
              <circle
                className="timer-bg"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e0d4ff"
                strokeWidth="8"
              />
              <circle
                className="timer-progress"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isBreak ? '#4ecdc4' : '#7012CE'}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="timer-content">
              <div className="timer-time">{formatTime(timeLeft)}</div>
              <div className="timer-label">{isBreak ? 'Перерыв' : 'Работа'}</div>
            </div>
          </div>
        </div>

        <div className="pomodoro-controls">
          {!isRunning && !isPaused && (
            <button className="btn-timer btn-start" onClick={handleStart}>
              <Play size={24} />
              <span>Начать</span>
            </button>
          )}
          
          {isRunning && (
            <button className="btn-timer btn-pause" onClick={handlePause}>
              <Pause size={24} />
              <span>Пауза</span>
            </button>
          )}
          
          {isPaused && (
            <button className="btn-timer btn-resume" onClick={handleStart}>
              <Play size={24} />
              <span>Продолжить</span>
            </button>
          )}

          <button className="btn-timer btn-reset" onClick={handleReset}>
            <RotateCcw size={20} />
            <span>Сброс</span>
          </button>

          <button className="btn-timer btn-stop" onClick={handleStop}>
            <Square size={20} />
            <span>Завершить</span>
          </button>
        </div>

        <div className="pomodoro-stats">
          <div className="stat-item">
            <CheckCircle size={20} />
            <span>Завершено: {completedIntervals}</span>
          </div>
          <div className="stat-item">
            <span>Осталось: {totalIntervals - completedIntervals - (isBreak ? 0 : 1)}</span>
          </div>
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="complete-modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="complete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="complete-modal-header">
              <h2>Сессия завершена!</h2>
              <button className="btn-close-modal" onClick={() => setShowCompleteModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="complete-modal-content">
              <div className="complete-stats">
                <div className="complete-stat-item">
                  <CheckCircle size={24} />
                  <div>
                    <p className="complete-stat-label">Завершено интервалов</p>
                    <p className="complete-stat-value">{completedIntervals + 1}</p>
                  </div>
                </div>
                <div className="complete-stat-item">
                  <Clock size={24} />
                  <div>
                    <p className="complete-stat-label">Общее время</p>
                    <p className="complete-stat-value">{Math.floor((completedIntervals + 1) * workTime / 60)}ч {(completedIntervals + 1) * workTime % 60}мин</p>
                  </div>
                </div>
              </div>
              <p className="complete-message">Отлично! Что бы ты хотел сделать дальше?</p>
            </div>
            <div className="complete-modal-actions">
              <button className="btn-view-stats" onClick={handleViewStats}>
                <TrendingUp size={20} />
                <span>Посмотреть статистику</span>
              </button>
              <button className="btn-pin-session" onClick={handlePinSession}>
                <Sparkles size={20} />
                <span>Закрепить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="ai-chat-modal-overlay" onClick={() => setShowAIChat(false)}>
          <div className="ai-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-header">
              <div className="ai-chat-header-content">
                <Brain size={24} />
                <div>
                  <h2>AI Помощник</h2>
                  <p>Генерация тестов и вопросов</p>
                </div>
              </div>
              <button className="btn-close-chat" onClick={() => setShowAIChat(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="ai-chat-messages">
              {aiMessages.map((message) => (
                <div key={message.id} className={`chat-message ${message.type}`}>
                  {message.type === 'ai' && (
                    <div className="ai-avatar">
                      <Brain size={20} />
                    </div>
                  )}
                  <div className="message-content">
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
              {isAIGenerating && (
                <div className="chat-message ai">
                  <div className="ai-avatar">
                    <Brain size={20} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="ai-chat-input">
              <input
                type="text"
                placeholder="Напишите тему или вопрос..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendAIMessage()}
                disabled={isAIGenerating}
              />
              <button 
                className="btn-send-ai"
                onClick={handleSendAIMessage}
                disabled={isAIGenerating || !aiInput.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;


