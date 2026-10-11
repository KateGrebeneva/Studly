import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo, Mascot, Spots } from './ui';
import './AuthLayout.css';

const AuthLayout = ({ children, aside, mood = 'idle', pose = 'stand', bubble, step }) => {
  const navigate = useNavigate();
  return (
    <div className="au">
      <div className="au-frame page-enter">
        <section className="au-aside panel-violet" aria-hidden="true">
          <Spots set="a" opacity={0.1} />
          <div className="au-aside-text">{aside}</div>
          <Mascot variant="full" pose={pose} mood={mood} bubble={bubble} bubblePosition="left" className="au-mascot" decorative />
        </section>

        <section className="au-main">
          <div className="au-top">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
              <ArrowLeft size={16} /> На главную
            </button>
            {step && <span className="au-step">{step}</span>}
          </div>
          <div className="au-body">
            <div className="au-brand">
              <Logo size={34} />
              <Mascot variant="head" mood={mood} className="au-mobile-mascot" decorative />
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthLayout;
