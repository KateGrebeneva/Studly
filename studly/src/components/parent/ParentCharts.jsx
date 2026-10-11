import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMinutes } from '../ui';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const parseDay = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const dayLabel = (iso) => {
  const d = parseDay(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

// изменение к прошлому периоду
export const Delta = ({ value, suffix = '%', invert = false, title }) => {
  if (value === null || value === undefined) return <span className="pc-delta is-flat" title={title}><Minus size={13} /> нет данных</span>;
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 3;
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`pc-delta ${flat ? 'is-flat' : good ? 'is-up' : 'is-down'}`} title={title}>
      <Icon size={13} /> {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
};

export const Ring = ({ value, size = 64, stroke = 7, color = 'var(--primary)', label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
  return (
    <span className="pc-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="pc-ring-arc" style={{ '--len': c }}
        />
      </svg>
      <b className="t-num">{label ?? (value === null || value === undefined ? '—' : `${v}%`)}</b>
    </span>
  );
};

// столбики по дням, точка сверху — закрытые задачи
export const DayBars = ({ data, color = 'var(--primary)', showTasks = false, height = 190 }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(30, ...data.map((d) => d.time));
  const step = data.length > 45 ? 14 : data.length > 14 ? 7 : 1;
  const avg = data.length ? data.reduce((s, d) => s + d.time, 0) / data.length : 0;
  const active = hover !== null ? data[hover] : null;
  return (
    <div className="pc-bars" style={{ '--bar-c': color, '--h': `${height}px` }} onMouseLeave={() => setHover(null)}>
      <div className="pc-bars-tip" aria-hidden={!active} style={{ opacity: active ? 1 : 0, left: active ? `${((hover + 0.5) / data.length) * 100}%` : '50%' }}>
        {active && (
          <>
            <b>{dayLabel(active.date)}</b>
            <span>{formatMinutes(active.time)}</span>
            {showTasks && <span>{active.tasks || 0} задач · {active.sessions || 0} сесс.</span>}
          </>
        )}
      </div>
      <div className="pc-bars-plot" role="img" aria-label={`Минуты учёбы по дням, всего ${formatMinutes(data.reduce((s, d) => s + d.time, 0))}`}>
        {avg > 0 && <span className="pc-bars-avg" style={{ bottom: `${(avg / max) * 100}%` }}><i>в среднем {Math.round(avg)} мин</i></span>}
        {data.map((d, i) => (
          <button
            type="button" key={d.date} className={`pc-bar ${hover === i ? 'is-hover' : ''} ${d.time ? '' : 'is-empty'}`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            aria-label={`${dayLabel(d.date)}: ${formatMinutes(d.time)}`}
            style={{ '--i': i }}
          >
            <span className="pc-bar-fill" style={{ height: d.time ? `${Math.max(3, (d.time / max) * 100)}%` : '3px' }} />
            {showTasks && d.tasks > 0 && <span className="pc-bar-dot" style={{ bottom: `calc(${Math.max(3, (d.time / max) * 100)}% + 6px)` }} />}
          </button>
        ))}
      </div>
      <div className="pc-bars-axis" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.date}>{(i % step === 0 || (i === data.length - 1 && i % step >= step / 2)) && (step === 1 ? d.day : dayLabel(d.date))}</span>
        ))}
      </div>
    </div>
  );
};

// тепловая карта: колонки — недели, строки — дни
export const Heatmap = ({ data }) => {
  const cells = useMemo(() => {
    if (!data.length) return [];
    const first = parseDay(data[0].date);
    const offset = (first.getDay() + 6) % 7; // Пн = 0
    const pad = Array.from({ length: offset }, (_, i) => ({ pad: true, key: `p${i}` }));
    return [...pad, ...data.map((d) => ({ ...d, key: d.date }))];
  }, [data]);
  const max = Math.max(1, ...data.map((d) => d.time));
  const level = (t) => (t <= 0 ? 0 : t < max * 0.25 ? 1 : t < max * 0.5 ? 2 : t < max * 0.75 ? 3 : 4);
  const active = data.filter((d) => d.time > 0).length;
  return (
    <div className="pc-heat">
      <div className="pc-heat-days" aria-hidden="true">{['Пн', '', 'Ср', '', 'Пт', '', 'Вс'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="pc-heat-grid" role="img" aria-label={`Активных дней за 12 недель: ${active}`}>
        {cells.map((c, i) => (c.pad
          ? <span key={c.key} className="pc-heat-cell is-pad" />
          : <span key={c.key} className={`pc-heat-cell l${level(c.time)}`} title={`${dayLabel(c.date)}: ${formatMinutes(c.time)}`} style={{ '--i': i }} />))}
      </div>
      <div className="pc-heat-legend" aria-hidden="true">
        меньше {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`pc-heat-cell l${l}`} />)} больше
      </div>
    </div>
  );
};

export const Donut = ({ items, size = 168, stroke = 22, center }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="pc-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Доли времени по предметам">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth={stroke} />
        {total > 0 && items.map((it) => {
          const len = (it.value / total) * c;
          const gap = items.length > 1 ? Math.min(3, len / 3) : 0;
          const el = (
            <circle
              key={it.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={it.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-acc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} className="pc-donut-seg"
            >
              <title>{`${it.label}: ${formatMinutes(it.value)}`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="pc-donut-center">{center}</div>
    </div>
  );
};

export const HBars = ({ items, color = 'var(--primary)', highlightMax = true }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  const top = Math.max(...items.map((i) => i.value));
  return (
    <ul className="pc-hbars">
      {items.map((it, i) => (
        <li key={it.key} className={highlightMax && it.value === top && top > 0 ? 'is-top' : ''}>
          <span className="pc-hbars-label">{it.label}</span>
          <span className="pc-hbars-track"><span style={{ width: `${(it.value / max) * 100}%`, '--c': color, '--i': i }} /></span>
          <span className="pc-hbars-val t-num">{it.value ? formatMinutes(it.value) : '—'}</span>
        </li>
      ))}
    </ul>
  );
};

// маленький график для карточки предмета
export const Spark = ({ data, color = 'var(--primary)', width = 120, height = 34 }) => {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const stepX = width / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - 3 - (v / max) * (height - 6)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `sp${String(color).replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg className="pc-spark" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
