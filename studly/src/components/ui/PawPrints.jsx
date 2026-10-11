import { useEffect } from 'react';

const PAW_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <ellipse cx="12" cy="15.5" rx="5.2" ry="4.6"/>
  <ellipse cx="5.2" cy="10.2" rx="2.1" ry="2.6"/>
  <ellipse cx="9.2" cy="6.2" rx="2.1" ry="2.7"/>
  <ellipse cx="14.8" cy="6.2" rx="2.1" ry="2.7"/>
  <ellipse cx="18.8" cy="10.2" rx="2.1" ry="2.6"/>
</svg>`;

// след лапки там, где кликнули
const PawPrints = () => {
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onDown = (e) => {
      if (reduce?.matches) return;
      if (e.button !== undefined && e.button !== 0) return;
      const el = document.createElement('span');
      el.className = 'paw-print';
      el.innerHTML = PAW_SVG;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.setProperty('--r', `${Math.round(Math.random() * 50 - 25)}deg`);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);
  return null;
};

export default PawPrints;
