import React, { useEffect, useState } from 'react';
import './Mascot.css';

// Спот — наш далматинец. pose — одна из 12 картинок, variant — full / bust / head / avatar,
// mood — анимация вокруг, cycle — позы, которые меняются по клику
const POSES = {
  stand: { w: 513, h: 966 },     // руки в карманах
  wave: { w: 654, h: 935 },      // приветствует, руки в стороны
  shy: { w: 454, h: 920 },       // смущается, лапки вместе
  thumbs: { w: 590, h: 890 },    // подмигивает, большие пальцы вверх
  sit: { w: 593, h: 680 },       // сидит
  lying: { w: 766, h: 529 },     // лежит, мечтает
  grumpy: { w: 479, h: 792 },    // сердится, лапы скрещены
  surprised: { w: 500, h: 818 }, // удивлён
  playful: { w: 691, h: 707 },   // игривый, язык наружу
  back: { w: 395, h: 797 },      // оглядывается через плечо
  jump: { w: 518, h: 737 },      // прыгает от радости
  head: { w: 746, h: 540 },      // крупный план
};

const MOOD_POSE = { idle: 'stand', cheer: 'jump', think: 'shy', sleep: 'lying', curious: 'sit', focus: 'stand' };

const Props = ({ mood }) => {
  if (mood === 'cheer') {
    return (
      <svg className="mascot-props mascot-confetti" viewBox="0 0 200 200" aria-hidden="true">
        <path d="M30 40l6 10-11 2z" fill="#f2a93b" />
        <rect x="160" y="30" width="10" height="10" rx="2" fill="#7d4ff0" transform="rotate(20 165 35)" />
        <circle cx="175" cy="90" r="5" fill="#5b82c9" />
        <circle cx="22" cy="100" r="4" fill="#e8566b" />
        <path d="M150 12l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#7d4ff0" />
        <path d="M40 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#2fb58c" />
      </svg>
    );
  }
  if (mood === 'think') {
    return (
      <svg className="mascot-props mascot-thought" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="150" cy="58" r="5" />
        <circle cx="164" cy="40" r="8" />
        <ellipse cx="180" cy="16" rx="18" ry="13" />
      </svg>
    );
  }
  if (mood === 'sleep') {
    return (
      <div className="mascot-props mascot-z" aria-hidden="true">
        <span>z</span><span>z</span><span>Z</span>
      </div>
    );
  }
  return null;
};

const Mascot = ({
  variant = 'full',
  pose,
  mood = 'idle',
  flip = false,
  bubble,
  bubblePosition = 'left',
  className = '',
  alt = 'Спот — маскот Studly',
  style,
  decorative = false,
  cycle,
}) => {
  const initial = pose || (variant === 'head' ? 'head' : MOOD_POSE[mood] || 'stand');
  const [current, setCurrent] = useState(initial);
  const [hop, setHop] = useState(0);

  // поза поменялась снаружи — подменяем с анимацией
  useEffect(() => { setCurrent(initial); }, [initial]);

  const interactive = Array.isArray(cycle) && cycle.length > 0;
  const onActivate = () => {
    if (!interactive) return;
    const i = cycle.indexOf(current);
    setCurrent(cycle[(i + 1) % cycle.length]);
    setHop((h) => h + 1);
  };

  const dims = POSES[current] || POSES.stand;
  const src = variant === 'avatar' ? '/mascot/mascot-avatar.png' : `/mascot/poses/${current}.webp`;
  // по пояс = верхние ~60% картинки
  const bustRatio = current === 'lying' || current === 'head' ? 1 : 0.6;
  const frameStyle = variant === 'bust' ? { aspectRatio: `${dims.w} / ${dims.h * bustRatio}` } : undefined;

  return (
    <figure
      className={`mascot mascot--${variant} mascot--${mood} pose--${current} ${flip ? 'is-flipped' : ''} ${interactive ? 'is-interactive' : ''} ${className}`}
      style={style}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? 'Спот — нажми, чтобы он сменил позу' : undefined}
    >
      {bubble && <figcaption className={`mascot-bubble mascot-bubble--${bubblePosition}`}>{bubble}</figcaption>}
      <Props mood={mood} />
      <span className="mascot-frame" style={frameStyle}>
        {variant === 'bust' ? (
          // картинка уходит ниже рамки, а сверху есть запас — Спот поднимается, тело «продолжается»
          <span className="mascot-clip">
            <img
              key={`${current}-${hop}`}
              src={src}
              width={dims.w}
              height={dims.h}
              alt={decorative ? '' : alt}
              aria-hidden={decorative || undefined}
              className="mascot-img"
              draggable="false"
              loading="lazy"
              decoding="async"
            />
          </span>
        ) : (
        <img
          key={`${current}-${hop}`}
          src={src}
          width={variant === 'avatar' ? 256 : dims.w}
          height={variant === 'avatar' ? 256 : dims.h}
          alt={decorative ? '' : alt}
          aria-hidden={decorative || undefined}
          className="mascot-img"
          draggable="false"
          loading="lazy"
          decoding="async"
        />
        )}
      </span>
    </figure>
  );
};

export default Mascot;
