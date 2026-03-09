import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Home, ArrowLeft } from 'lucide-react';
import './NotFound404.css';

const NotFound404 = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`not-found-page ${isLoaded ? 'loaded' : ''}`}>
      <div className="nf-bg-shapes">
        <div className="nf-shape nf-shape-1"></div>
        <div className="nf-shape nf-shape-2"></div>
        <div className="nf-shape nf-shape-3"></div>
      </div>

      <div className="nf-content">
        <div className="nf-visual">
          <div className="nf-book-stack">
            <div className="nf-book nf-book-1"></div>
            <div className="nf-book nf-book-2"></div>
            <div className="nf-book nf-book-3"></div>
          </div>
          <div className="nf-404">404</div>
        </div>

        <h1 className="nf-title">Упс! Страница заблудилась</h1>
        <p className="nf-subtitle">
          Похоже, эта страница ушла на перемену и не вернулась. <br />
          Давай вернёмся к учёбе!
        </p>

        <div className="nf-actions">
          <button className="nf-btn nf-btn-outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Назад
          </button>
          <Link to="/" className="nf-btn nf-btn-outline">
            <BookOpen size={20} />
            На главную
          </Link>
        </div>
      </div>

      <div className="nf-footer">
        <img src="/logo-studly.png" alt="Studly" className="nf-logo" />
      </div>
    </div>
  );
};

export default NotFound404;
