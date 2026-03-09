import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './RegisterPage.css';

const ParentInvitationPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const goBackToPreviousPage = () => {
    setIsLoaded(false);
    setTimeout(() => navigate(-1), 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!invitationCode.trim()) {
      setError('Введите код приглашения');
      return;
    }
    
    // Валидация формата кода (например, ST-XXXX)
    const codePattern = /^[A-Z]{2}-\d{4}$/;
    if (!codePattern.test(invitationCode.trim())) {
      setError('Неверный формат кода. Пример: ST-1234');
      return;
    }

    setError('');
    console.log('Подтверждение кода:', invitationCode);
    // Здесь можно добавить логику проверки кода на сервере
    navigate('/dashboard');
  };

  return (
    <div className={`register-page ${isLoaded ? 'loaded' : ''}`}>
      {/* Кнопка назад */}
      <button className="back-button" onClick={goBackToPreviousPage}>
        <ArrowLeft size={28} />
      </button>

      <div className="register-container">
        {/* Левая часть */}
        <div className="register-left">
          <div className="left-content">
            <img src="/12.png" alt="Studly" className="mission-img" />
          </div>
        </div>

        {/* Правая часть */}
        <div className="register-right">
          <div className="form-wrapper">
            {/* Заголовок */}
            <div className="form-header">
              <img src="/logo-studly.png" alt="Studly" className="mission-img" />
              <h1>Подключение к аккаунту</h1>
              <p className="form-subtitle">Введите код приглашения от вашего ребёнка</p>
              <p className="form-subtitle">Следите за успехами и помогайте в учёбе!</p>
            </div>

            {/* Индикатор шагов */}
            <div className="steps-indicator">
              <div className="step-dot active"></div>
              <div className="step-line active"></div>
              <div className="step-dot active"></div>
            </div>

            {/* Поле ввода кода */}
            <form onSubmit={handleSubmit} className="register-form">
              <div className="input-group">
                <label>Код приглашения</label>
                <input
                  type="text"
                  value={invitationCode}
                  onChange={(e) => {
                    setInvitationCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="ST-1234"
                  className={error ? 'error' : ''}
                  style={{
                    textAlign: 'center',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                  }}
                />
                {error && <span className="error-text">{error}</span>}
              </div>

              {/* Кнопка подтверждения */}
              <button type="submit" className="btn-register animated-btn">
                Подтвердить
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentInvitationPage;


