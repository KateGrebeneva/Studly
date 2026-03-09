import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './StudentInvitationPage.css';

const StudentInvitationPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [uniqueCode, setUniqueCode] = useState('');

  useEffect(() => {
    setIsLoaded(true);

    const generateCode = () => {
      const part = Math.floor(1000 + Math.random() * 9000);
      return `ST-${part}`;
    };

    setUniqueCode(generateCode());
  }, []);

  const goBackToPreviousPage = () => {
    setIsLoaded(false);
    setTimeout(() => navigate(-1), 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Отправка кода:', uniqueCode);
  };

  const handleSkip = () => {
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
              <h1>Приглашение</h1>
              <p className="form-subtitle">Отправь приглашение родителю или преподавателю</p>
              <p className="form-subtitle">Планируйте учёбу вместе!</p>
            </div>

            {/* Индикатор шагов */}
            <div className="steps-indicator">
              <div className="step-dot active"></div>
              <div className="step-line active"></div>
              <div className="step-dot active"></div>
            </div>

            {/* Уникальный код */}
            <div className="code-box">
              <span>Ваш уникальный идентификатор</span>
              <div className="code">{uniqueCode}</div>
            </div>

            {/* Кнопки */}
            <form onSubmit={handleSubmit} className="register-form">
              <button type="submit" className="btn-register animated-btn">
                Отправить
              </button>

              <button
                type="button"
                className="btn-skip animated-btn"
                onClick={handleSkip}
              >
                Пропустить
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInvitationPage;
