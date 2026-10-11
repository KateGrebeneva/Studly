import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Clock, CheckCircle2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Quote, Trophy, Plus } from 'lucide-react';
import { statsAPI } from '../services/api';
import AppLayout from './AppLayout';
import { PageHeader, Mascot, EmptyState, formatMinutes, plural, toLocalDateKey } from './ui';
import './StatisticsPage.css';

const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAY_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const LEVELS = [
  { name: 'Щенок', from: 0, to: 300, text: 'Первые шаги. Каждая сессия приближает к новому уровню.' },
  { name: 'Ученик', from: 300, to: 900, text: 'Привычка заниматься уже появилась. Так держать!' },
  { name: 'Знаток', from: 900, to: 2400, text: 'Ты знаешь, как учиться в своём ритме.' },
  { name: 'Мастер', from: 2400, to: 6000, text: 'Серьёзный объём работы за плечами.' },
  { name: 'Легенда', from: 6000, to: Infinity, text: 'Спот гордится тобой. Правда.' },
];

const StatisticsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dash, setDash] = useState({ streak: 0, tasksCompleted: 0, timeStudied: 0 });
  const [quote, setQuote] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);
  const [daily, setDaily] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboard, week, subjects, quoteData, dailyData] = await Promise.all([
          statsAPI.getDashboard(),
          statsAPI.getWeekly(),
          statsAPI.getSubjects(),
          statsAPI.getQuote().catch(() => null),
          statsAPI.getDaily(400).catch(() => []),
        ]);
        setDash(dashboard || {});
        const map = new Map((week || []).map((w) => [toLocalDateKey(w.date), { time: Number(w.time || 0), tasks: Number(w.tasks || 0) }]));
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const w = map.get(toLocalDateKey(d));
          days.push({ day: DAY_SHORT[d.getDay()], dow: d.getDay(), time: w ? w.time : 0, tasks: w ? w.tasks : 0, isToday: i === 0 });
        }
        setWeekly(days);
        setSubjectStats((subjects || []).map((s) => ({ name: s.name, time: Number(s.total_minutes || 0), color: s.color || '#7d4ff0' })).sort((a, b) => b.time - a.time));
        setQuote(quoteData?.quote || null);
        setDaily(dailyData || []);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить статистику. Проверь подключение к серверу.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // минуты по дням берём с сервера, чтобы совпадало с главной
  const minutesByDay = useMemo(() => {
    const m = new Map();
    daily.forEach((d) => m.set(toLocalDateKey(d.date), Number(d.time || 0)));
    return m;
  }, [daily]);

  const weekTotal = weekly.reduce((s, d) => s + d.time, 0);
  const prevWeekTotal = useMemo(() => {
    let sum = 0;
    for (let i = 7; i <= 13; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      sum += minutesByDay.get(toLocalDateKey(d)) || 0;
    }
    return sum;
  }, [minutesByDay]);
  const weekChange = prevWeekTotal > 0 ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100) : null;

  const totalMinutes = subjectStats.reduce((s, x) => s + x.time, 0);
  const maxDay = Math.max(30, ...weekly.map((d) => d.time));
  const maxSubject = Math.max(1, ...subjectStats.map((s) => s.time));
  const bestDay = weekly.reduce((b, c) => (c.time > (b?.time || 0) ? c : b), null);
  const activeDays = weekly.filter((d) => d.time > 0).length;
  const avgActive = activeDays ? Math.round(weekTotal / activeDays) : 0;

  const monthDays = useMemo(() => {
    const y = month.getFullYear(); const mo = month.getMonth();
    const first = new Date(y, mo, 1);
    const total = new Date(y, mo + 1, 0).getDate();
    const pad = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const cells = Array(pad).fill(null);
    for (let d = 1; d <= total; d++) {
      const date = new Date(y, mo, d);
      cells.push({ d, date, min: minutesByDay.get(toLocalDateKey(date)) || 0 });
    }
    return cells;
  }, [month, minutesByDay]);
  const monthTotal = monthDays.reduce((s, c) => s + (c?.min || 0), 0);
  const monthActive = monthDays.filter((c) => c && c.min > 0).length;
  const maxMonthDay = Math.max(1, ...monthDays.map((c) => c?.min || 0));

  const level = LEVELS.find((l) => totalMinutes >= l.from && totalMinutes < l.to) || LEVELS[0];
  const levelIdx = LEVELS.indexOf(level);
  const levelPct = level.to === Infinity ? 100 : Math.round(((totalMinutes - level.from) / (level.to - level.from)) * 100);

  // пончик по предметам
  const donut = (() => {
    const R = 54; const C = 2 * Math.PI * R; let acc = 0;
    return subjectStats.filter((s) => s.time > 0).map((s) => {
      const len = (s.time / Math.max(1, totalMinutes)) * C;
      const seg = { ...s, dash: `${Math.max(0, len - 2)} ${C}`, offset: -acc };
      acc += len;
      return seg;
    });
  })();

  const TABS = [['overview', 'Неделя'], ['calendar', 'Календарь'], ['subjects', 'Предметы'], ['growth', 'Рост']];

  return (
    <AppLayout>
      <PageHeader title="Статистика" subtitle="Сколько, когда и чему ты учишься — по реальным сессиям" />

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="st-top">
        <div className="st-kpis rise rise-1">
          <div className="st-kpi">
            <Flame size={20} className="c-sun" />
            <b className="t-num">{dash.streak || 0}</b>
            <span>{plural(dash.streak || 0, 'день', 'дня', 'дней')} подряд</span>
          </div>
          <div className="st-kpi">
            <Clock size={20} className="c-violet" />
            <b className="t-num">{formatMinutes(totalMinutes)}</b>
            <span>всего по предметам</span>
          </div>
          <div className="st-kpi">
            <CheckCircle2 size={20} className="c-mint" />
            <b className="t-num">{dash.tasksCompleted ?? 0}</b>
            <span>{plural(dash.tasksCompleted ?? 0, 'задача', 'задачи', 'задач')} сегодня</span>
          </div>
          <div className="st-kpi">
            {weekChange !== null && weekChange < 0 ? <TrendingDown size={20} className="c-rose" /> : <TrendingUp size={20} className="c-denim" />}
            <b className="t-num">{weekChange === null ? formatMinutes(weekTotal) : `${weekChange > 0 ? '+' : ''}${weekChange}%`}</b>
            <span>{weekChange === null ? 'за 7 дней' : 'к прошлой неделе'}</span>
          </div>
        </div>
        {quote && (
          <figure className="st-quote rise rise-2">
            <Quote size={22} />
            <blockquote>{quote}</blockquote>
          </figure>
        )}
      </div>

      <div className="st-tabs rise rise-2">
        <div className="segmented" role="tablist" aria-label="Разделы статистики">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={activeTab === k} className={activeTab === k ? 'is-active' : ''} onClick={() => setActiveTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 360 }} />
      ) : (
        <>
          {activeTab === 'overview' && (
            <section className="st-grid st-grid-overview">
              <div className="card card-pad st-week rise">
                <div className="card-head">
                  <div>
                    <h2 className="t-h2">Последние 7 дней</h2>
                    <p className="t-muted t-small">{formatMinutes(weekTotal)} · {activeDays} {plural(activeDays, 'активный день', 'активных дня', 'активных дней')}</p>
                  </div>
                </div>
                <div className="st-bars" role="img" aria-label={`Минуты по дням: ${weekly.map((d) => `${d.day} ${d.time}`).join(', ')}`}>
                  {[1, 0.5].map((g) => <span key={g} className="st-gridline" style={{ bottom: `calc(29px + ${g} * (100% - 37px))` }}><small>{Math.round(maxDay * g)}</small></span>)}
                  {weekly.map((d, i) => (
                    <div key={i} className={`st-bar ${d.isToday ? 'is-today' : ''} ${bestDay && d === bestDay && d.time > 0 ? 'is-best' : ''}`}>
                      <span className="st-bar-track">
                        <span className="st-bar-fill" style={{ height: `${d.time ? Math.max(4, (d.time / maxDay) * 100) : 0}%` }}>
                          {d.time > 0 && <em className="t-num">{d.time}</em>}
                        </span>
                      </span>
                      <span className="st-bar-day">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="st-side">
                <div className="card card-pad st-fact rise rise-1">
                  <p className="t-muted t-small">Самый продуктивный день</p>
                  <b className="st-fact-big">{bestDay && bestDay.time > 0 ? DAY_FULL[bestDay.dow] : '—'}</b>
                  <p className="t-small">{bestDay && bestDay.time > 0 ? `${formatMinutes(bestDay.time)} учёбы` : 'Пока нет данных за неделю'}</p>
                </div>
                <div className="card card-pad st-fact rise rise-2">
                  <p className="t-muted t-small">В среднем в активный день</p>
                  <b className="st-fact-big t-num">{formatMinutes(avgActive)}</b>
                  <p className="t-small">{avgActive >= 50 ? 'Отличный ритм — минимум два Pomodoro.' : avgActive > 0 ? 'Попробуй добавить ещё один интервал.' : 'Начни с одной сессии в день.'}</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'calendar' && (
            <section className="st-grid st-grid-cal">
              <div className="card card-pad rise">
                <div className="st-cal-head">
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}><ChevronLeft size={18} /></button>
                  <h2 className="t-h2">{MONTHS[month.getMonth()]} {month.getFullYear()}</h2>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Следующий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}><ChevronRight size={18} /></button>
                </div>
                <div className="st-cal">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <span key={d} className="st-cal-wd">{d}</span>)}
                  {monthDays.map((c, i) => (c ? (
                    <span key={i} className={`st-cal-day ${c.min > 0 ? 'is-on' : ''} ${c.date.toDateString() === new Date().toDateString() ? 'is-today' : ''}`}
                      style={{ '--a': c.min > 0 ? 0.35 + 0.65 * (c.min / maxMonthDay) : 0 }}
                      title={`${c.d} ${MONTHS_GEN[month.getMonth()]}: ${formatMinutes(c.min)}`}>
                      <i />
                      <small>{c.d}</small>
                    </span>
                  ) : <span key={i} />))}
                </div>
                <div className="st-cal-legend">
                  <span>меньше</span>
                  {[0.35, 0.6, 0.85, 1].map((a) => <i key={a} style={{ '--a': a }} />)}
                  <span>больше</span>
                </div>
              </div>
              <div className="st-side">
                <div className="card card-pad st-fact rise rise-1">
                  <p className="t-muted t-small">Всего за {MONTHS_GEN[month.getMonth()]}</p>
                  <b className="st-fact-big t-num">{formatMinutes(monthTotal)}</b>
                  <p className="t-small">{monthActive} {plural(monthActive, 'день', 'дня', 'дней')} с учёбой</p>
                </div>
                <div className="card card-pad st-fact st-fact-mascot rise rise-2">
                  <Mascot variant="full" pose={monthActive > 0 ? 'thumbs' : 'lying'} mood={monthActive > 0 ? 'cheer' : 'sleep'} decorative />
                  <p className="t-small">{monthActive > 0 ? 'Каждое пятно — день, когда ты занимался. Собери побольше!' : 'В этом месяце пока ни одного пятнышка. Самое время начать.'}</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'subjects' && (
            subjectStats.length === 0 ? (
              <EmptyState title="Пока нет предметов" text="Добавь предметы, и здесь появится распределение учебного времени."
                actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/subjects')}><Plus size={16} /> Добавить предмет</button>} />
            ) : (
              <section className="st-grid st-grid-subj">
                <div className="card card-pad rise">
                  <h2 className="t-h2" style={{ marginBottom: '1.2rem' }}>Время по предметам</h2>
                  <ul className="st-subj-list">
                    {subjectStats.map((s) => (
                      <li key={s.name}>
                        <div className="st-subj-row">
                          <span className="st-subj-name"><i style={{ background: s.color }} />{s.name}</span>
                          <span className="t-num t-small">{formatMinutes(s.time)}{totalMinutes ? <span className="t-muted"> · {Math.round((s.time / totalMinutes) * 100)}%</span> : null}</span>
                        </div>
                        <div className="progress"><span style={{ width: `${(s.time / maxSubject) * 100}%`, '--c': s.color }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card card-pad st-donut-card rise rise-1">
                  <svg viewBox="0 0 140 140" className="st-donut" role="img" aria-label="Доли предметов">
                    <circle cx="70" cy="70" r="54" className="st-donut-trk" />
                    {donut.map((s) => (
                      <circle key={s.name} cx="70" cy="70" r="54" fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={s.dash} strokeDashoffset={s.offset} transform="rotate(-90 70 70)" />
                    ))}
                  </svg>
                  <div className="st-donut-center">
                    <small className="t-muted">чаще всего</small>
                    <b>{subjectStats[0]?.time > 0 ? subjectStats[0].name : '—'}</b>
                  </div>
                  <p className="t-small t-muted st-donut-note">{subjectStats[0]?.time > 0 ? 'Скоро тебе будет подвластно всё!' : 'Заверши сессию, чтобы увидеть распределение.'}</p>
                </div>
              </section>
            )
          )}

          {activeTab === 'growth' && (
            <section className="st-growth panel-violet rise">
              <div className="st-growth-text">
                <p className="st-growth-kicker">Уровень {levelIdx + 1} из {LEVELS.length}</p>
                <h2 className="st-growth-title">{level.name}</h2>
                <p className="st-growth-desc">{level.text}</p>
                <div className="st-growth-bar">
                  <div className="st-growth-track"><span style={{ width: `${levelPct}%` }} /></div>
                  <div className="st-growth-meta">
                    <span className="t-num">{formatMinutes(totalMinutes)}</span>
                    {level.to !== Infinity && <span>до уровня «{LEVELS[levelIdx + 1].name}» — {formatMinutes(level.to - totalMinutes)}</span>}
                  </div>
                </div>
                <ol className="st-levels">
                  {LEVELS.map((l, i) => (
                    <li key={l.name} className={i < levelIdx ? 'is-past' : i === levelIdx ? 'is-now' : ''}>
                      {i < levelIdx ? <Trophy size={14} /> : <span className="t-num">{i + 1}</span>}
                      {l.name}
                    </li>
                  ))}
                </ol>
              </div>
              <Mascot variant="full" pose={['sit', 'stand', 'thumbs', 'wave', 'jump'][levelIdx]} mood="cheer" className="st-growth-mascot" decorative />
            </section>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default StatisticsPage;
