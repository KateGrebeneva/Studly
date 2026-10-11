import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle2, Flame, Target, CalendarClock, ArrowRight, Sparkles, BarChart3, BookOpen, CalendarDays } from 'lucide-react';
import { statsAPI, sessionsAPI, goalsAPI, authAPI } from '../services/api';
import AppLayout from './AppLayout';
import { Mascot, Modal, Spots, EmptyState, formatMinutes, plural, toLocalDateKey, STATUS_LABELS } from './ui';
import './Dashboard.css';

const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const sessionDate = (s) => s.scheduled_at || s.completed_at || s.created_at;

const formatWhen = (dt) => {
  if (!dt) return 'Без времени';
  const d = new Date(dt);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Сегодня, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Завтра, ${time}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`;
};

const greetingFor = (h) => (h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер');

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authAPI.getCurrentUser() || {};
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todayStats, setTodayStats] = useState({ timeStudied: 0, tasksCompleted: 0, sessionsCompleted: 0, streak: 0 });
  const [allSessions, setAllSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [week, setWeek] = useState([]);
  const [goals, setGoals] = useState([]);
  const [dayModal, setDayModal] = useState({ open: false, date: null, sessions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (location.pathname !== '/dashboard') return;
    try {
      const [dashboard, sessions, subjectsData, weekly, goalsData] = await Promise.all([
        statsAPI.getDashboard(),
        sessionsAPI.getAll(),
        statsAPI.getSubjects(),
        statsAPI.getWeekly(),
        goalsAPI.getAll().catch(() => []),
      ]);
      setTodayStats(dashboard || {});
      setAllSessions(sessions || []);
      setSubjects((subjectsData || []).map((s) => ({ id: s.id, name: s.name, color: s.color || '#7d4ff0', minutes: Number(s.total_minutes || 0) })));
      setGoals((goalsData || []).filter((g) => !g.is_completed && !g.is_expired).slice(0, 3));
      const map = new Map((weekly || []).map((w) => [toLocalDateKey(w.date), { time: Number(w.time || 0), tasks: Number(w.tasks || 0) }]));
      const days = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const w = map.get(toLocalDateKey(d));
        days.push({ day: DAY_SHORT[d.getDay()], date: d, time: w ? w.time : 0, tasks: w ? w.tasks : 0, isToday: i === 0 });
      }
      setWeek(days);
      setError('');
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить данные. Проверь, что сервер запущен, и обнови страницу.');
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/dashboard') loadData();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loadData, location.pathname]);

  const upcoming = useMemo(() => {
    const open = allSessions.filter((s) => s.status === 'planned' || s.status === 'in_progress');
    return open
      .slice()
      .sort((a, b) => {
        const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
        const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 4);
  }, [allSessions]);

  const recentDone = useMemo(
    () => allSessions.filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))
      .slice(0, 4),
    [allSessions],
  );

  const plannedToday = useMemo(() => {
    const key = toLocalDateKey(new Date());
    return allSessions.filter((s) => s.scheduled_at && toLocalDateKey(s.scheduled_at) === key && s.status !== 'completed').length;
  }, [allSessions]);

  const sessionDays = useMemo(() => {
    const set = new Map();
    allSessions.forEach((s) => {
      const dt = sessionDate(s);
      if (!dt || s.status === 'cancelled') return;
      const k = toLocalDateKey(dt);
      const prev = set.get(k) || { done: false, planned: false };
      if (s.status === 'completed') prev.done = true; else prev.planned = true;
      set.set(k, prev);
    });
    return set;
  }, [allSessions]);

  const weekTotal = week.reduce((s, d) => s + d.time, 0);
  const maxDay = Math.max(30, ...week.map((d) => d.time));
  const maxSubject = Math.max(1, ...subjects.map((s) => s.minutes));
  const next = upcoming[0];
  const name = (user.name || '').split(' ')[0];
  const now = new Date();

  const mascotLine = (() => {
    if (loading) return 'Секунду, собираю твой день…';
    if (todayStats.sessionsCompleted > 0) return `Уже ${todayStats.sessionsCompleted} ${plural(todayStats.sessionsCompleted, 'сессия', 'сессии', 'сессий')} сегодня. Так держать!`;
    if (next) return 'Ближайшая сессия ждёт. Начнём?';
    if (todayStats.streak > 1) return `Серия ${todayStats.streak} ${plural(todayStats.streak, 'день', 'дня', 'дней')} — не прерывай её!`;
    return 'Запланируй первую сессию — я напомню, с чего начать.';
  })();

  const heroPose = error ? 'grumpy' : todayStats.sessionsCompleted > 0 ? 'thumbs' : next ? 'wave' : 'shy';

  const getCalendarDays = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const total = new Date(y, m + 1, 0).getDate();
    const pad = first.getDay() === 0 ? 6 : first.getDay() - 1;
    return [...Array(pad).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  };

  const openDay = (dayNum) => {
    if (!dayNum) return;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    const key = toLocalDateKey(d);
    const list = allSessions.filter((s) => {
      const dt = sessionDate(s);
      return dt && toLocalDateKey(dt) === key;
    });
    setDayModal({ open: true, date: d, sessions: list });
  };
  const closeDay = useCallback(() => setDayModal({ open: false, date: null, sessions: [] }), []);

  return (
    <AppLayout>
      <div className="db">
        {error && <div className="alert alert-error rise" role="alert">{error}</div>}

        {/* шапка */}
        <section className="db-hero panel-violet rise">
          <Spots set="a" opacity={0.1} />
          <div className="db-hero-text">
            <p className="db-hero-date">{now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="db-hero-title">
              {greetingFor(now.getHours())}{name ? ',' : ''}<br />
              <span>{name || 'студент'}</span>
            </h1>
            <p className="db-hero-sub">
              {loading ? 'Загружаем твой учебный день…' : (
                <>
                  Сегодня — {formatMinutes(todayStats.timeStudied)} учёбы и {todayStats.tasksCompleted} {plural(todayStats.tasksCompleted, 'задача', 'задачи', 'задач')}.
                  {plannedToday > 0 && ` В плане ещё ${plannedToday} ${plural(plannedToday, 'сессия', 'сессии', 'сессий')}.`}
                </>
              )}
            </p>
            <div className="db-hero-actions">
              {next ? (
                <button type="button" className="btn btn-ink btn-lg" onClick={() => navigate(`/pomodoro?session=${next.id}`)}>
                  <Play size={18} /> Начать: {next.goal.length > 22 ? `${next.goal.slice(0, 22)}…` : next.goal}
                </button>
              ) : (
                <button type="button" className="btn btn-ink btn-lg" onClick={() => navigate('/sessions')}>
                  <Plus size={18} /> Новая сессия
                </button>
              )}
              <button type="button" className="btn btn-on-panel btn-lg" onClick={() => navigate('/ai-planner')}>
                <Sparkles size={18} /> План от AI
              </button>
            </div>
          </div>
          <div className="db-hero-mascot">
            <Mascot variant="bust" pose={heroPose} mood={todayStats.sessionsCompleted > 0 ? 'cheer' : 'idle'} bubble={mascotLine} bubblePosition="left" cycle={[heroPose, 'thumbs', 'playful', 'jump']} />
          </div>
        </section>

        {/* сегодня и серия */}
        <section className="db-row db-row-metrics">
          <div className="db-metrics card rise rise-1">
            <div className="db-metric">
              <span className="db-metric-icon" style={{ '--c': 'var(--violet-500)' }}><Clock size={18} /></span>
              <span className="db-metric-val t-num">{formatMinutes(todayStats.timeStudied)}</span>
              <span className="db-metric-label">учёбы сегодня</span>
            </div>
            <div className="db-metric">
              <span className="db-metric-icon" style={{ '--c': 'var(--mint-500)' }}><CheckCircle2 size={18} /></span>
              <span className="db-metric-val t-num">{todayStats.tasksCompleted}</span>
              <span className="db-metric-label">{plural(todayStats.tasksCompleted, 'задача выполнена', 'задачи выполнено', 'задач выполнено')}</span>
            </div>
            <div className="db-metric">
              <span className="db-metric-icon" style={{ '--c': 'var(--denim-500)' }}><Target size={18} /></span>
              <span className="db-metric-val t-num">{todayStats.sessionsCompleted}</span>
              <span className="db-metric-label">{plural(todayStats.sessionsCompleted, 'сессия завершена', 'сессии завершено', 'сессий завершено')}</span>
            </div>
            <div className="db-metric">
              <span className="db-metric-icon" style={{ '--c': 'var(--sun-500)' }}><BarChart3 size={18} /></span>
              <span className="db-metric-val t-num">{formatMinutes(weekTotal)}</span>
              <span className="db-metric-label">за 7 дней</span>
            </div>
          </div>

          <div className="db-streak card rise rise-2">
            <div className="db-streak-top">
              <Flame size={20} />
              <span>Серия</span>
            </div>
            <p className="db-streak-num t-num">{todayStats.streak || 0}<small>{plural(todayStats.streak || 0, 'день', 'дня', 'дней')}</small></p>
            <div className="db-streak-spots" aria-label="Активность за неделю">
              {week.map((d) => (
                <span key={d.date.toISOString()} className={`db-spot ${d.time > 0 ? 'is-on' : ''} ${d.isToday ? 'is-today' : ''}`} title={`${d.day}: ${formatMinutes(d.time)}`}>
                  <i />
                  <small>{d.day}</small>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* план и цели */}
        <section className="db-row db-row-plan">
          <div className="card card-pad db-plan rise rise-2">
            <div className="card-head">
              <h2 className="t-h2">Учебный план</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/sessions')}>Все сессии <ChevronRight size={16} /></button>
            </div>
            {loading ? (
              <div className="db-skel-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}</div>
            ) : upcoming.length ? (
              <ol className="db-timeline">
                {upcoming.map((s, i) => (
                  <li key={s.id} className="db-tl-item" style={{ '--c': s.subject_color || 'var(--primary)' }}>
                    <span className="db-tl-dot" aria-hidden="true" />
                    <div className="db-tl-body">
                      <span className="db-tl-when">{formatWhen(s.scheduled_at)}</span>
                      <span className="db-tl-goal">{s.goal}</span>
                      <span className="db-tl-meta">
                        <span className="badge badge-subject" style={{ '--c': s.subject_color || 'var(--primary)' }}>{s.subject_name || 'Общее'}</span>
                        <span>{s.intervals_count} × {s.work_interval} мин</span>
                      </span>
                    </div>
                    <button type="button" className={`btn ${i === 0 ? 'btn-primary' : 'btn-soft'} btn-sm`} onClick={() => navigate(`/pomodoro?session=${s.id}`)} aria-label={`Начать сессию «${s.goal}»`}>
                      <Play size={15} /> Начать
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                mood="sleep"
                title="План пока пустой"
                text="Создай сессию с конкретной целью или попроси AI-планировщик разложить неделю за тебя."
                actions={(
                  <>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/sessions')}><Plus size={16} /> Новая сессия</button>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/ai-planner')}><Sparkles size={16} /> AI-план</button>
                  </>
                )}
              />
            )}
          </div>

          <div className="card card-pad db-goals rise rise-3">
            <div className="card-head">
              <h2 className="t-h2">Цели</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/achievements')}>Все <ChevronRight size={16} /></button>
            </div>
            {goals.length ? (
              <ul className="db-goal-list">
                {goals.map((g) => {
                  const cur = g.current_value ?? 0;
                  const target = g.target_value || 1;
                  const pct = Math.min(100, Math.round((cur / target) * 100));
                  return (
                    <li key={g.id}>
                      <div className="db-goal-row">
                        <span className="db-goal-title">{g.title}</span>
                        <span className="db-goal-val t-num">{cur}/{target}</span>
                      </div>
                      <div className="progress"><span style={{ width: `${pct}%`, '--c': g.color || 'var(--primary)' }} /></div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {goals.length > 0 && (
              <div className="db-goals-foot">
                <Mascot variant="head" mood="curious" decorative />
                <p>Маленькая цель на день помогает не терять ритм.</p>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/achievements')}><Plus size={15} /> Цель</button>
              </div>
            )}
            {goals.length === 0 && (
              <div className="db-goals-empty">
                <p>Поставь цель на день, неделю или месяц — прогресс будет виден здесь.</p>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/achievements')}><Target size={16} /> Поставить цель</button>
              </div>
            )}
          </div>
        </section>

        {/* аналитика */}
        <section className="db-row db-row-charts">
          <div className="card card-pad db-week rise rise-3">
            <div className="card-head">
              <div>
                <h2 className="t-h2">Неделя в минутах</h2>
                <p className="t-muted t-small">Всего {formatMinutes(weekTotal)}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/statistics')}>Аналитика <ChevronRight size={16} /></button>
            </div>
            <div className="db-bars" role="img" aria-label={`Минуты учёбы за 7 дней: ${week.map((d) => `${d.day} ${d.time}`).join(', ')}`}>
              {week.map((d) => {
                const h = d.time > 0 ? Math.max(6, (d.time / maxDay) * 100) : 0;
                return (
                  <div key={d.date.toISOString()} className={`db-bar ${d.isToday ? 'is-today' : ''}`}>
                    <span className="db-bar-val t-num">{d.time > 0 ? d.time : ''}</span>
                    <span className="db-bar-track"><span className="db-bar-fill" style={{ height: `${h}%` }} /></span>
                    <span className="db-bar-day">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-pad db-subjects rise rise-4">
            <div className="card-head">
              <h2 className="t-h2">По предметам</h2>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate('/subjects')} aria-label="К предметам"><ArrowRight size={16} /></button>
            </div>
            {subjects.length ? (
              <ul className="db-subj-list">
                {subjects.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <div className="db-subj-row">
                      <span className="db-subj-name"><i style={{ background: s.color }} />{s.name}</span>
                      <span className="t-muted t-small t-num">{formatMinutes(s.minutes)}</span>
                    </div>
                    <div className="progress"><span style={{ width: `${(s.minutes / maxSubject) * 100}%`, '--c': s.color }} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="db-goals-empty">
                <p>Добавь предметы, чтобы видеть, куда уходит учебное время.</p>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/subjects')}><BookOpen size={16} /> Добавить предмет</button>
              </div>
            )}
          </div>

          <div className="card card-pad db-cal rise rise-5">
            <div className="db-cal-head">
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Предыдущий месяц"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                <ChevronLeft size={18} />
              </button>
              <h2 className="t-h2">{MONTHS[currentMonth.getMonth()]} <span className="t-muted">{currentMonth.getFullYear()}</span></h2>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Следующий месяц"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="db-cal-grid">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <span key={d} className="db-cal-wd">{d}</span>)}
              {getCalendarDays().map((day, idx) => {
                if (!day) return <span key={`e${idx}`} />;
                const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const info = sessionDays.get(toLocalDateKey(d));
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <button
                    type="button"
                    key={day}
                    className={`db-cal-day ${isToday ? 'is-today' : ''} ${info?.done ? 'is-done' : ''} ${info?.planned ? 'is-planned' : ''}`}
                    onClick={() => openDay(day)}
                    aria-label={`${day} ${MONTHS[currentMonth.getMonth()]}${info?.done ? ', была учёба' : ''}${info?.planned ? ', есть план' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="db-cal-legend">
              <span><i className="lg-done" /> занимался</span>
              <span><i className="lg-plan" /> в плане</span>
            </div>
          </div>
        </section>

        {/* последние сессии */}
        {recentDone.length > 0 && (
          <section className="db-recent rise rise-6">
            <div className="card-head">
              <h2 className="t-h2">Недавно завершено</h2>
            </div>
            <div className="db-recent-list">
              {recentDone.map((s) => (
                <article key={s.id} className="db-recent-item" style={{ '--c': s.subject_color || 'var(--primary)' }}>
                  <span className="badge badge-subject" style={{ '--c': s.subject_color || 'var(--primary)' }}>{s.subject_name || 'Общее'}</span>
                  <h3>{s.goal}</h3>
                  <p className="t-muted t-small">
                    <CalendarClock size={14} /> {s.completed_at ? new Date(s.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—'} · {formatMinutes(s.duration_minutes || 0)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <Modal
        open={dayModal.open}
        onClose={closeDay}
        icon={CalendarDays}
        title={dayModal.date ? dayModal.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Сессии'}
        subtitle={dayModal.sessions.length ? `${dayModal.sessions.length} ${plural(dayModal.sessions.length, 'сессия', 'сессии', 'сессий')}` : null}
      >
        {dayModal.sessions.length ? (
          <ul className="db-day-list">
            {dayModal.sessions.map((s) => {
              const dt = sessionDate(s);
              return (
                <li key={s.id} className="db-day-item">
                  <div className="db-day-main">
                    <span className="badge badge-subject" style={{ '--c': s.subject_color || 'var(--primary)' }}>{s.subject_name || 'Общее'}</span>
                    <span className="db-day-goal">{s.goal}</span>
                    <span className="t-muted t-small">
                      {dt ? new Date(dt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''} · {formatMinutes(s.duration_minutes || 25)} · {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  {s.status !== 'completed' && (
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate(`/pomodoro?session=${s.id}`)}>
                      <Play size={15} /> Начать
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState mood="sleep" title="В этот день сессий нет" text="Выходной тоже часть плана. Или запланируй сессию на эту дату." actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/sessions')}><Plus size={16} /> Запланировать</button>} />
        )}
      </Modal>
    </AppLayout>
  );
};

export default Dashboard;
