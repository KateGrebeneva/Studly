import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import Mascot from './Mascot';

/* логотип */
const LogoMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
    <rect width="40" height="40" rx="12" fill="var(--primary)" />
    <path d="M8 16.5 20 11l12 5.5L20 22z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M13 19.2v6.3c0 1.6 3.1 3 7 3s7-1.4 7-3v-6.3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="31" cy="26" r="2.2" fill="#fff" />
  </svg>
);

export const Logo = ({ size = 28, className = '' }) => (
  <span className={`logo ${className}`}>
    <LogoMark size={size} />
    <span className="logo-word">studly</span>
  </span>
);

/* пятна далматинца */
const SPOT_SETS = {
  // пятна у краёв и чуть обрезаны, как на шерсти
  a: [
    { l: '-3%', t: '-10%', w: 96, h: 80, r: -12 },
    { l: '93%', t: '6%', w: 74, h: 62, r: 22 },
    { l: '86%', t: '74%', w: 120, h: 100, r: -8 },
    { l: '44%', t: '93%', w: 44, h: 38, r: 30 },
    { l: '70%', t: '-4%', w: 26, h: 22, r: 0 },
  ],
  b: [
    { l: '88%', t: '-8%', w: 110, h: 92, r: 10 },
    { l: '96%', t: '52%', w: 56, h: 48, r: -20 },
    { l: '-2%', t: '82%', w: 84, h: 70, r: 14 },
    { l: '58%', t: '92%', w: 30, h: 26, r: 0 },
  ],
};
export const Spots = ({ set = 'a', color = '#fff', opacity = 0.12 }) => (
  <span className="spots" style={{ color }} aria-hidden="true">
    {SPOT_SETS[set].map((s, i) => (
      <i
        key={i}
        style={{ left: s.l, top: s.t, width: s.w, height: s.h, transform: `rotate(${s.r}deg)`, '--o': opacity }}
      />
    ))}
  </span>
);

/* модалки */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// модалку рендерим в body через портал, иначе анимация страницы ломает fixed
export const Modal = ({
  open, onClose, title, subtitle, children, footer, wide = false, labelledBy,
  icon: Icon, accent, className = '', bodyClassName = '',
}) => {
  const ref = useRef(null);
  const bodyRef = useRef(null);
  const [closing, setClosing] = useState(false);
  const [edges, setEdges] = useState({ top: true, bottom: true });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (!onCloseRef.current) return;
    if (prefersReducedMotion()) { onCloseRef.current(); return; }
    setClosing(true);
    setTimeout(() => { setClosing(false); onCloseRef.current?.(); }, 190);
  }, []);

  useEffect(() => { if (open) setClosing(false); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); requestClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector('input:not([type="radio"]):not([type="checkbox"]), select, textarea')
        || ref.current?.querySelector('button:not(.modal-close)');
      el?.focus({ preventScroll: true });
    }, 80);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      clearTimeout(t);
      if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    };
  }, [open, requestClose]);

  // тень у шапки/подвала при прокрутке
  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const top = el.scrollTop < 4;
    const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    measure();
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [open, measure, children]);

  // на телефоне окно можно смахнуть вниз
  const drag = useRef(null);
  const onGripStart = (e) => {
    drag.current = { y: e.touches[0].clientY, dy: 0 };
    ref.current?.classList.add('is-dragging');
  };
  const onGripMove = (e) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onGripEnd = () => {
    const el = ref.current;
    if (!drag.current || !el) return;
    const { dy } = drag.current;
    drag.current = null;
    el.classList.remove('is-dragging');
    el.classList.add('is-releasing');
    if (dy > 110) {
      el.style.transform = 'translateY(100%)';
      setTimeout(() => onCloseRef.current?.(), 200);
    } else {
      el.style.transform = '';
      setTimeout(() => el.classList.remove('is-releasing'), 260);
    }
  };

  if (!open || typeof document === 'undefined') return null;
  const id = labelledBy || 'modal-title';
  const style = accent ? { '--modal-accent': accent } : undefined;
  return createPortal(
    <div
      className={`modal-backdrop ${closing ? 'is-closing' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''} ${accent ? 'has-accent' : ''} ${className}`}
        role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} ref={ref} style={style}
      >
        <span className="modal-sheen" aria-hidden="true" />
        {onClose && (
          <div className="modal-grip" onTouchStart={onGripStart} onTouchMove={onGripMove} onTouchEnd={onGripEnd} aria-hidden="true" />
        )}
        {(title || onClose) && (
          <div className={`modal-head ${title ? '' : 'is-bare'} ${edges.top ? '' : 'is-raised'}`}>
            {Icon && <span className="modal-icon" aria-hidden="true"><Icon size={22} /></span>}
            <div className="modal-titles">
              {title && <h2 id={id}>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className="modal-close" onClick={requestClose} aria-label="Закрыть">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={`modal-body ${bodyClassName}`} ref={bodyRef} onScroll={measure}>
          {children}
        </div>
        {footer && <div className={`modal-foot modal-foot-fixed ${edges.bottom ? '' : 'is-raised'}`}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

/* уведомления */
export const useToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current);
    setToast({ message, type, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  const hide = useCallback(() => setToast(null), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast && typeof document !== 'undefined' ? createPortal(
    <div key={toast.id} className={`toast ${toast.type === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
      {toast.type === 'error' ? <AlertCircle size={20} className="toast-icon" /> : <CheckCircle2 size={20} className="toast-icon" />}
      <span>{toast.message}</span>
      <button type="button" onClick={hide} aria-label="Скрыть уведомление"><X size={16} /></button>
    </div>,
    document.body,
  ) : null;
  return [node, show];
};

/* пустое состояние */
const EMPTY_POSE = { sleep: 'lying', think: 'shy', curious: 'sit', cheer: 'thumbs', idle: 'stand', error: 'grumpy' };
export const EmptyState = ({ title, text, mood = 'curious', actions, mascotWidth = 96, className = '' }) => (
  <div className={`empty ${className}`}>
    <Mascot variant="full" pose={EMPTY_POSE[mood] || 'sit'} mood={mood === 'cheer' ? 'cheer' : 'idle'} className={`empty-mascot empty-mascot--${EMPTY_POSE[mood] || 'sit'}`} style={{ width: Math.round(mascotWidth * ((EMPTY_POSE[mood] || 'sit') === 'lying' ? 1.5 : 0.85)) }} decorative />
    <div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  </div>
);

/* заголовок страницы */
export const PageHeader = ({ title, subtitle, actions, kicker }) => (
  <header className="page-head rise">
    <div className="page-head-text">
      {kicker && <div className="page-kicker">{kicker}</div>}
      <h1 className="t-h1">{title}</h1>
      {subtitle && <p className="page-sub">{subtitle}</p>}
    </div>
    {actions && <div className="page-head-actions">{actions}</div>}
  </header>
);

/* хелперы */
export const formatMinutes = (mins) => {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} мин`;
  if (!r) return `${h} ч`;
  return `${h} ч ${r} мин`;
};

export const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};

export const toLocalDateKey = (dt) => {
  // '2026-10-09' и так ключ, new Date() сдвинул бы её по UTC
  if (typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dt)) return dt;
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const STATUS_LABELS = {
  planned: 'Запланирована',
  in_progress: 'В процессе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

export { Mascot };
