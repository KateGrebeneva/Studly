import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, MessageSquare, TrendingUp, Clock, Target, CheckCircle, Send } from 'lucide-react';
import { sessionsAPI, aiAPI } from '../services/api';
import './SessionCompletePage.css';

const SessionCompletePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const intervals = parseInt(searchParams.get('intervals') || '1');
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [sessionData, setSessionData] = useState({ goal: '', subject_name: '' });
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'ai', text: 'Отлично! Ты завершил сессию. Перейди на вкладку "Закрепление" — я сгенерирую тесты.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;
      try {
        const sess = await sessionsAPI.getById(sessionId);
        setSessionData({ goal: sess.goal || '', subject_name: sess.subject_name || '' });
      } catch {}
    };
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleLoadReinforcement = async () => {
    if (chatMessages.some(m => m.type === 'ai' && m.text && m.text.includes('1.'))) return;
    const goal = sessionData.goal || inputMessage.trim() || 'изученный материал';
    if (!goal && !inputMessage.trim()) return;
    setIsGenerating(true);
    setChatMessages(prev => [...prev, { id: Date.now(), type: 'ai', text: 'Генерирую вопросы...' }]);
    try {
      const res = await aiAPI.generateTest(goal, sessionData.subject_name);
      const q = res?.questions || '';
      setChatMessages(prev => prev.slice(0, -1).concat([{ id: Date.now() + 1, type: 'ai', text: q || 'Не удалось сгенерировать.' }]));
    } catch {
      setChatMessages(prev => prev.slice(0, -1).concat([{ id: Date.now() + 1, type: 'ai', text: 'Ошибка. Напиши тему и нажми отправить.' }]));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMessage = { id: Date.now(), type: 'user', text: inputMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      const res = await aiAPI.generateTest(inputMessage, sessionData.subject_name);
      const q = res?.questions || '';
      setChatMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', text: q || 'Попробуй уточнить тему.' }]);
    } catch {
      setChatMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', text: 'Ошибка. Попробуй ещё раз.' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const sessionStats = {
    totalTime: intervals * 25,
    intervalsCompleted: intervals,
    focusScore: Math.min(95, 70 + intervals * 5),
    productivity: Math.min(100, 60 + intervals * 8)
  };

  return (
    <div className={`session-complete-page ${isLoaded ? 'loaded' : ''}`}>
      <div className="complete-container">
        <div className="complete-header">
          <div className="success-icon">
            <CheckCircle size={48} />
          </div>
          <h1 className="complete-title">Сессия завершена!</h1>
          <p className="complete-subtitle">Ты отлично поработал. Время подвести итоги.</p>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={20} />
            <span>Аналитика</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'reinforcement' ? 'active' : ''}`}
            onClick={() => setActiveTab('reinforcement')}
          >
            <MessageSquare size={20} />
            <span>Закрепление</span>
          </button>
        </div>

        {activeTab === 'analytics' && (
          <div className="analytics-content">
            <div className="stats-grid-complete">
              <div className="stat-card-complete">
                <div className="stat-icon-complete" style={{ background: 'linear-gradient(135deg, #7012CE, #9d4edd)' }}>
                  <Clock size={24} />
                </div>
                <div className="stat-info">
                  <p className="stat-label-complete">Время работы</p>
                  <p className="stat-value-complete">{sessionStats.totalTime} мин</p>
                </div>
              </div>

              <div className="stat-card-complete">
                <div className="stat-icon-complete" style={{ background: 'linear-gradient(135deg, #7012CE, #9d4edd)' }}>
                  <Target size={24} />
                </div>
                <div className="stat-info">
                  <p className="stat-label-complete">Интервалов</p>
                  <p className="stat-value-complete">{sessionStats.intervalsCompleted}</p>
                </div>
              </div>

              <div className="stat-card-complete">
                <div className="stat-icon-complete" style={{ background: 'linear-gradient(135deg, #ff6b6b, #ee5a6f)' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <p className="stat-label-complete">Фокус</p>
                  <p className="stat-value-complete">{sessionStats.focusScore}%</p>
                </div>
              </div>

              <div className="stat-card-complete">
                <div className="stat-icon-complete" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
                  <BarChart3 size={24} />
                </div>
                <div className="stat-info">
                  <p className="stat-label-complete">Продуктивность</p>
                  <p className="stat-value-complete">{sessionStats.productivity}%</p>
                </div>
              </div>
            </div>

            <div className="chart-placeholder">
              <h3>График продуктивности</h3>
              <div className="chart-visual">
                <div className="chart-bar" style={{ height: '80%' }}></div>
                <div className="chart-bar" style={{ height: '90%' }}></div>
                <div className="chart-bar" style={{ height: '75%' }}></div>
                <div className="chart-bar" style={{ height: '95%' }}></div>
                <div className="chart-bar" style={{ height: '85%' }}></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reinforcement' && (
          <div className="reinforcement-content">
            {sessionData.goal && (
              <button
                className="btn-load-test"
                onClick={handleLoadReinforcement}
                disabled={isGenerating}
                style={{ marginBottom: '1rem' }}
              >
                {isGenerating ? 'Генерация...' : 'Сгенерировать тест по теме сессии'}
              </button>
            )}
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message ${message.type === 'user' ? 'user-message' : 'ai-message'}`}
                  >
                    <div className="message-content">
                      {message.text}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="chat-message ai-message">
                    <div className="message-content typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-container">
                <input
                  type="text"
                  placeholder="Напиши тему, которую изучал..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="chat-input"
                  disabled={isGenerating}
                />
                <button
                  className="chat-send-button"
                  onClick={handleSendMessage}
                  disabled={isGenerating || !inputMessage.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="complete-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate('/sessions')}
          >
            Новая сессия
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCompletePage;


