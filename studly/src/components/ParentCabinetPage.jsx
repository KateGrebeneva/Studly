import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, X, Clock, CheckCircle2, Flame, Target, CalendarPlus, KeyRound, ArrowLeft, BookOpen, CalendarDays,
  TrendingUp, TrendingDown, AlertTriangle, Moon, Sun, PieChart, Trophy, ListChecks, Timer, UserPlus, Sparkles,
  CalendarClock, LayoutDashboard, AlarmClock, Lock, ChevronRight,
} from 'lucide-react';
import { parentAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import AppLayout from './AppLayout';
import { PageHeader, Mascot, Modal, EmptyState, Spots, useToast, formatMinutes, plural, STATUS_LABELS } from './ui';
import { Delta, Ring, DayBars, Heatmap, Donut, HBars, Spark, dayLabel } from './parent/ParentCharts';
import './ParentCabinetPage.css';

const EMPTY_SESSION = { goal: '', subject_id: '', work_interval: 25, intervals_count: 4, scheduled_at: '' };
const PERIODS = [{ v: 7, label: '7 дней' }, { v: 30, label: '30 дней' }, { v: 90, label: '90 дней' }];
const TABS = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'subjects', label: 'Предметы', icon: BookOpen },
  { id: 'progress', label: 'Задачи и цели', icon: ListChecks },
  { id: 'sessions', label: 'Сессии', icon: CalendarDays },
];
const INSIGHT_ICONS = {
  'trend-up': TrendingUp, 'trend-down': TrendingDown, flame: Flame, clock: Clock, book: BookOpen,
  alert: AlertTriangle, target: Target, sun: Sun, pie: PieChart, moon: Moon,
};
const PRIORITY = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
const GOAL_TYPES = { daily: 'на день', weekly: 'на неделю', monthly: 'на месяц' };
const SESSION_FILTERS = [
  { id: 'all', label: 'Все' }, { id: 'planned', label: 'Запланированы' },
  { id: 'completed', label: 'Завершены' }, { id: 'missed', label: 'Пропущены' },
];

const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const daysAgo = (n) => {
  if (n === null || n === undefined) return 'ещё не занимался';
  if (n === 0) return 'сегодня';
  if (n === 1) return 'вчера';
  return `${n} ${plural(n, 'день', 'дня', 'дней')} назад`;
};
const isMissed = (s) => ['planned', 'in_progress'].includes(s.status) && s.scheduled_at && new Date(s.scheduled_at) < new Date(Date.now() - 3600e3);
const initial = (name) => name?.trim()?.charAt(0)?.toUpperCase() || '?';

/* показатели */
const Kpi = ({ icon: Icon, tone, label, value, foot, children }) => (
  <div className={`pc-kpi tone-${tone}`}>
    <span className="pc-kpi-icon"><Icon size={19} /></span>
    <span className="pc-kpi-label">{label}</span>
    <b className="pc-kpi-value t-num">{value}</b>
    {foot && <span className="pc-kpi-foot">{foot}</span>}
    {children}
  </div>
);

/* страница предмета */
const SubjectDetail = ({ data, onBack, onAssign }) => {
  const { subject, totals, sessions, tasks } = data;
  const [taskFilter, setTaskFilter] = useState('open');
  const list = data.task_list.filter((t) => (taskFilter === 'open' ? !t.is_completed : taskFilter === 'done' ? t.is_completed : true));
  return (
    <div className="pc-subject page-enter from-right" style={{ '--c': subject.color }}>
      <div className="pc-subject-head card">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={16} /> Все предметы</button>
        <div className="pc-subject-title">
          <span className="pc-subject-badge"><BookOpen size={22} /></span>
          <div>
            <h3 className="t-h1">{subject.name}</h3>
            <p className="t-muted t-small">
              Всего {formatMinutes(subject.total_minutes)} · последнее занятие {daysAgo(subject.days_since)}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm pc-subject-assign" onClick={() => onAssign(subject.id)}>
            <CalendarPlus size={16} /> Назначить по предмету
          </button>
        </div>
      </div>

      <div className="pc-kpis">
        <Kpi icon={Clock} tone="violet" label={`За ${data.period_days} дн.`} value={formatMinutes(totals.minutes)}
          foot={<Delta value={totals.change} title="К прошлому периоду" />} />
        <Kpi icon={CalendarDays} tone="denim" label="Дней с занятиями" value={`${totals.active_days} из ${data.period_days}`} />
        <Kpi icon={Timer} tone="sun" label="Сессий завершено" value={sessions.completed}
          foot={sessions.avg_minutes ? `в среднем ${formatMinutes(sessions.avg_minutes)}` : 'пока нет'} />
        <Kpi icon={CheckCircle2} tone="mint" label="Задачи" value={`${tasks.done} / ${tasks.total}`}
          foot={tasks.overdue ? <span className="pc-warn">{tasks.overdue} просрочено</span> : `${tasks.open} в работе`}>
          {tasks.total > 0 && <div className="progress pc-kpi-progress"><span style={{ width: `${tasks.completion}%`, '--c': 'var(--mint-500)' }} /></div>}
        </Kpi>
      </div>

      <div className="card card-pad">
        <div className="card-head">
          <h4 className="t-h2">Время по дням</h4>
          {data.best_day && <span className="badge badge-subject">чаще всего — {data.best_day.toLowerCase()}</span>}
        </div>
        {totals.minutes > 0
          ? <DayBars data={data.daily} color={subject.color} />
          : <p className="pc-muted-box">За этот период по предмету не было завершённых сессий.</p>}
      </div>

      <div className="pc-grid-2">
        <div className="card card-pad">
          <div className="card-head"><h4 className="t-h2">Задачи</h4>
            <div className="segmented pc-seg-sm" role="tablist">
              {[['open', 'Открытые'], ['done', 'Готовые'], ['all', 'Все']].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={taskFilter === id} className={taskFilter === id ? 'is-active' : ''} onClick={() => setTaskFilter(id)}>{label}</button>
              ))}
            </div>
          </div>
          {list.length === 0 ? <p className="pc-muted-box">{taskFilter === 'open' ? 'Открытых задач нет — всё сделано!' : 'Здесь пока пусто.'}</p> : (
            <ul className="pc-tasks">
              {list.map((t) => (
                <li key={t.id} className={`${t.is_completed ? 'is-done' : ''} ${t.is_overdue ? 'is-overdue' : ''}`}>
                  <span className="pc-task-check">{t.is_completed ? <CheckCircle2 size={18} /> : <span />}</span>
                  <span className="pc-task-title">{t.title}</span>
                  <span className={`pc-prio prio-${t.priority}`}>{PRIORITY[t.priority]}</span>
                  {t.due_date && <span className={`pc-task-due ${t.is_overdue ? 'pc-warn' : 't-muted'}`}>{t.is_overdue ? 'просрочено · ' : 'до '}{dayLabel(t.due_date)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card card-pad">
          <div className="card-head"><h4 className="t-h2">Ритм</h4>{data.best_time && <span className="t-muted t-small">лучшее время {data.best_time} ч</span>}</div>
          <HBars color={subject.color} items={data.weekdays.map((w) => ({ key: w.day, label: w.day, value: w.minutes }))} />
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-head"><h4 className="t-h2">История сессий</h4><span className="t-muted t-small">последние {data.session_list.length}</span></div>
        {data.session_list.length === 0 ? <p className="pc-muted-box">Сессий по предмету ещё не было.</p> : (
          <ul className="pc-timeline">
            {data.session_list.map((s) => {
              const missed = s.is_missed;
              const status = missed ? 'missed' : s.status;
              return (
                <li key={s.id} className={`st-${status}`}>
                  <span className="pc-tl-dot" />
                  <div className="pc-tl-body">
                    <b>{s.goal}</b>
                    <span className="t-muted t-small">{fmtDateTime(s.completed_at || s.scheduled_at || s.created_at)} · {formatMinutes(s.duration_minutes)}</span>
                  </div>
                  <span className={`badge ${status === 'completed' ? 'badge-mint' : status === 'missed' ? 'badge-rose' : 'badge-violet'}`}>{missed ? 'Пропущена' : STATUS_LABELS[s.status] || s.status}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

/* страница */
const ParentCabinetPage = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [period, setPeriod] = useState(30);
  const [tab, setTab] = useState('overview');
  const [detailLoading, setDetailLoading] = useState(false);
  const [subjectDetail, setSubjectDetail] = useState(null);
  const [subjectLoading, setSubjectLoading] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linking, setLinking] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [unlinkModal, setUnlinkModal] = useState({ open: false, child: null });
  const [toast, showToast] = useToast();
  const req = useRef(0);

  const loadChildData = useCallback(async (child, days) => {
    const id = ++req.current;
    setSelectedChild(child);
    setDetailLoading(true);
    try {
      const [ov, sess] = await Promise.all([
        parentAPI.getChildOverview(child.id, days),
        parentAPI.getChildSessions(child.id),
      ]);
      if (id !== req.current) return;
      setOverview(ov);
      setSessions(sess || []);
    } catch (e) {
      if (id === req.current) showToast(e.message || 'Не удалось загрузить данные ученика', 'error');
    } finally {
      if (id === req.current) setDetailLoading(false);
    }
  }, [showToast]);

  const loadChildren = useCallback(async (selectFirst = false) => {
    try {
      const list = await parentAPI.getChildren();
      setChildren(list || []);
      if (selectFirst && list?.length) loadChildData(list[0], 30);
    } catch (e) {
      showToast(e.message || 'Не удалось загрузить список учеников', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadChildData, showToast]);

  useEffect(() => { loadChildren(true); }, [loadChildren]);

  const selectChild = (c) => {
    if (c.id === selectedChild?.id) return;
    setOverview(null);
    setSubjectDetail(null);
    setTab('overview');
    loadChildData(c, period);
  };

  const changePeriod = (days) => {
    setPeriod(days);
    if (selectedChild) loadChildData(selectedChild, days);
    if (subjectDetail && selectedChild) openSubject(subjectDetail.subject.id, days);
  };

  const openSubject = async (subjectId, days = period) => {
    if (!selectedChild) return;
    setSubjectLoading(subjectId);
    try {
      const d = await parentAPI.getChildSubject(selectedChild.id, subjectId, days);
      setSubjectDetail(d);
      setTab('subjects');
      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    } catch (e) {
      showToast(e.message || 'Не удалось открыть предмет', 'error');
    } finally {
      setSubjectLoading(null);
    }
  };

  const handleLinkChild = async (e) => {
    e.preventDefault();
    setLinkError('');
    if (!inviteCode.trim()) { setLinkError('Введите код из профиля ученика'); return; }
    setLinking(true);
    try {
      await parentAPI.linkChild(inviteCode.trim().toUpperCase());
      setInviteCode('');
      setShowAddModal(false);
      showToast('Ученик добавлен');
      loadChildren(!selectedChild);
    } catch (err) {
      setLinkError(err.message || 'Код не подошёл. Проверьте его и попробуйте снова.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkConfirm = async () => {
    if (!unlinkModal.child) return;
    try {
      await parentAPI.unlinkChild(unlinkModal.child.id);
      const wasSelected = selectedChild?.id === unlinkModal.child.id;
      setUnlinkModal({ open: false, child: null });
      showToast('Ученик отвязан');
      if (wasSelected) { setSelectedChild(null); setOverview(null); setSubjectDetail(null); }
      loadChildren(wasSelected);
    } catch (e) {
      showToast(e.message || 'Не удалось отвязать', 'error');
    }
  };

  const openSessionModal = (subjectId = '') => {
    setSessionForm({ ...EMPTY_SESSION, subject_id: subjectId ? String(subjectId) : '' });
    setShowSessionModal(true);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.goal.trim() || !selectedChild) return;
    try {
      await parentAPI.createSessionForChild(selectedChild.id, {
        goal: sessionForm.goal.trim(),
        subject_id: sessionForm.subject_id ? parseInt(sessionForm.subject_id, 10) : null,
        work_interval: sessionForm.work_interval,
        short_break: 5,
        long_break: 15,
        intervals_count: sessionForm.intervals_count,
        scheduled_at: sessionForm.scheduled_at ? new Date(sessionForm.scheduled_at).toISOString() : null,
      });
      setShowSessionModal(false);
      showToast(`Сессия для ${selectedChild.name} назначена`);
      loadChildData(selectedChild, period);
    } catch (err) {
      showToast(err.message || 'Не удалось создать сессию', 'error');
    }
  };

  const ov = overview;
  const today = ov?.today;
  const studiedToday = (today?.timeStudied || 0) > 0;
  const subjectsSorted = ov ? [...ov.subjects].sort((a, b) => b.period_minutes - a.period_minutes || b.total_minutes - a.total_minutes) : [];
  const donutItems = subjectsSorted.filter((s) => s.period_minutes > 0).map((s) => ({ key: s.id, label: s.name, value: s.period_minutes, color: s.color }));
  if (ov?.totals.general_minutes) donutItems.push({ key: 'g', label: 'Без предмета', value: ov.totals.general_minutes, color: 'var(--line-strong)' });
  const donutTotal = donutItems.reduce((s, i) => s + i.value, 0);
  const filteredSessions = sessions.filter((s) => {
    if (sessionFilter === 'missed') return isMissed(s);
    if (sessionFilter === 'planned') return s.status === 'planned' && !isMissed(s);
    if (sessionFilter === 'completed') return s.status === 'completed';
    return true;
  });
  const sessionCount = (id) => sessions.filter((s) => (id === 'missed' ? isMissed(s) : id === 'planned' ? s.status === 'planned' && !isMissed(s) : id === 'completed' ? s.status === 'completed' : true)).length;
  const sessionSubjects = ov?.subjects || [];
  const goalPercent = (g) => (g.target ? Math.min(100, Math.round((100 * g.current) / g.target)) : 0);

  return (
    <AppLayout>
      <PageHeader
        title="Прогресс учеников"
        subtitle="Время, предметы, задачи и ритм — по реальным данным из Studly ученика"
        actions={<button type="button" className="btn btn-primary" onClick={() => { setLinkError(''); setShowAddModal(true); }}><Plus size={18} /> Добавить ученика</button>}
      />

      {loading ? (
        <div className="pc-skel"><div className="skeleton" style={{ height: 64 }} /><div className="skeleton" style={{ height: 180 }} /><div className="skeleton" style={{ height: 320 }} /></div>
      ) : children.length === 0 ? (
        <section className="pr-empty panel-violet rise">
          <Spots set="b" opacity={0.1} />
          <div className="pr-empty-text">
            <h2>Добавьте первого ученика</h2>
            <ol>
              <li>Ученик открывает <b>Профиль</b> в своём Studly.</li>
              <li>Нажимает «Создать код» в блоке «Код для родителя».</li>
              <li>Вы вводите этот код здесь — и видите подробную статистику.</li>
            </ol>
            <button type="button" className="btn btn-ink btn-lg" onClick={() => setShowAddModal(true)}><KeyRound size={18} /> Ввести код</button>
          </div>
          <Mascot variant="full" pose="sit" mood="idle" className="pr-empty-mascot" decorative />
        </section>
      ) : (
        <>
          <div className="pc-children rise" role="tablist" aria-label="Ученики">
            {children.map((c) => (
              <div key={c.id} className={`pc-child ${selectedChild?.id === c.id ? 'is-active' : ''}`}>
                <button type="button" role="tab" aria-selected={selectedChild?.id === c.id} className="pc-child-main" onClick={() => selectChild(c)}>
                  <span className="pc-avatar">{initial(c.name)}</span>
                  <span className="pc-child-meta"><b>{c.name}</b><small>{c.email}</small></span>
                </button>
                <button type="button" className="pc-child-x" onClick={() => setUnlinkModal({ open: true, child: c })} aria-label={`Отвязать ${c.name}`} title="Отвязать"><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="pc-child pc-child-add" onClick={() => { setLinkError(''); setShowAddModal(true); }}>
              <UserPlus size={18} /> <span>Добавить</span>
            </button>
          </div>

          {!selectedChild ? (
            <EmptyState mood="curious" title="Выберите ученика" text="Нажмите на имя выше, чтобы открыть его статистику." />
          ) : !ov ? (
            <div className="pc-skel"><div className="skeleton" style={{ height: 180 }} /><div className="skeleton" style={{ height: 120 }} /><div className="skeleton" style={{ height: 320 }} /></div>
          ) : (
            <div className={`pc-body ${detailLoading ? 'is-loading' : ''}`} aria-busy={detailLoading}>
              {/* шапка */}
              <section className="pc-hero panel-violet rise">
                <Spots set="a" opacity={0.09} />
                <div className="pc-hero-main">
                  <span className="pc-hero-avatar">{initial(ov.child.name)}</span>
                  <div className="pc-hero-text">
                    <h2>{ov.child.name}</h2>
                    <span className={`pc-today ${studiedToday ? 'is-on' : ''}`}>
                      <i /> {studiedToday ? `Сегодня занимался ${formatMinutes(today.timeStudied)}` : 'Сегодня ещё не занимался'}
                    </span>
                  </div>
                </div>
                <div className="pc-hero-today">
                  <div><Clock size={16} /><b className="t-num">{formatMinutes(today.timeStudied)}</b><span>сегодня</span></div>
                  <div><Timer size={16} /><b className="t-num">{today.sessionsCompleted}</b><span>{plural(today.sessionsCompleted, 'сессия', 'сессии', 'сессий')}</span></div>
                  <div><CheckCircle2 size={16} /><b className="t-num">{today.tasksCompleted}</b><span>{plural(today.tasksCompleted, 'задача', 'задачи', 'задач')}</span></div>
                  <div><Flame size={16} /><b className="t-num">{ov.totals.streak}</b><span>{plural(ov.totals.streak, 'день', 'дня', 'дней')} подряд</span></div>
                </div>
                <div className="pc-hero-actions">
                  <button type="button" className="btn btn-on-panel" onClick={() => openSessionModal()}><CalendarPlus size={18} /> Назначить сессию</button>
                </div>
                <Mascot variant="bust" pose={studiedToday ? 'thumbs' : 'sit'} mood={studiedToday ? 'cheer' : 'idle'} className="pc-hero-mascot" decorative />
              </section>

              {/* вкладки и период */}
              <div className="pc-toolbar">
                <div className="pc-tabs" role="tablist" aria-label="Разделы статистики">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={`pc-tab ${tab === id ? 'is-active' : ''}`}
                      onClick={() => { setTab(id); if (id !== 'subjects') setSubjectDetail(null); }}>
                      <Icon size={17} /> <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="segmented" role="radiogroup" aria-label="Период">
                  {PERIODS.map((p) => (
                    <button key={p.v} type="button" role="radio" aria-checked={period === p.v} className={period === p.v ? 'is-active' : ''} onClick={() => changePeriod(p.v)}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* обзор */}
              {tab === 'overview' && (
                <div className="pc-tab-body page-enter" key={`ov-${period}`}>
                  <div className="pc-kpis">
                    <Kpi icon={Clock} tone="violet" label={`Время за ${ov.period_days} дн.`} value={formatMinutes(ov.totals.minutes)}
                      foot={<><Delta value={ov.totals.change} title="К прошлому такому же периоду" /> <span className="t-muted">к прошлому периоду</span></>} />
                    <Kpi icon={CalendarDays} tone="denim" label="Дней с учёбой" value={`${ov.totals.active_days} / ${ov.period_days}`}
                      foot={ov.totals.active_days ? `в такие дни ≈ ${formatMinutes(ov.totals.avg_active_day)}` : 'занятий не было'}>
                      <div className="progress pc-kpi-progress"><span style={{ width: `${(100 * ov.totals.active_days) / ov.period_days}%`, '--c': 'var(--denim-500)' }} /></div>
                    </Kpi>
                    <div className="pc-kpi tone-sun pc-kpi-ring">
                      <Ring value={ov.sessions.completion_rate} color="var(--sun-500)" />
                      <div>
                        <span className="pc-kpi-label">Сессий доведено</span>
                        <b className="pc-kpi-value t-num">{ov.sessions.completed}</b>
                        <span className="pc-kpi-foot">{ov.sessions.missed ? <span className="pc-warn">{ov.sessions.missed} пропущено</span> : 'без пропусков'}</span>
                      </div>
                    </div>
                    <Kpi icon={CheckCircle2} tone="mint" label="Задач закрыто" value={ov.tasks.done_period}
                      foot={ov.tasks.overdue ? <span className="pc-warn">{ov.tasks.overdue} просрочено</span> : `${ov.tasks.open} в работе`}>
                      {ov.tasks.total > 0 && <div className="progress pc-kpi-progress"><span style={{ width: `${ov.tasks.completion}%`, '--c': 'var(--mint-500)' }} /></div>}
                    </Kpi>
                  </div>

                  <div className="pc-grid-main">
                    <div className="card card-pad pc-chart-card">
                      <div className="card-head">
                        <div><h3 className="t-h2">Динамика</h3><p className="t-muted t-small">Минуты учёбы по дням · точка — закрытые задачи</p></div>
                        <span className="pc-big-num t-num">{formatMinutes(ov.totals.minutes)}</span>
                      </div>
                      <DayBars data={ov.daily} showTasks />
                    </div>

                    <aside className="card card-pad pc-insights">
                      <div className="pc-insights-head">
                        <Mascot variant="avatar" mood="curious" decorative className="pc-insights-avatar" />
                        <div><h3 className="t-h2">Спот заметил</h3><p className="t-muted t-small">Выводы по данным за период</p></div>
                      </div>
                      {ov.insights.length === 0 ? <p className="pc-muted-box">Пока всё ровно — особых замечаний нет.</p> : (
                        <ul>
                          {ov.insights.map((it, i) => {
                            const Icon = INSIGHT_ICONS[it.icon] || Sparkles;
                            return (
                              <li key={i} className={`pc-insight tone-${it.tone}`} style={{ '--i': i }}>
                                <span className="pc-insight-icon"><Icon size={16} /></span>
                                <span>{it.text}</span>
                                {it.subject_id && (
                                  <button type="button" className="pc-insight-link" onClick={() => openSubject(it.subject_id)} aria-label="Открыть предмет"><ChevronRight size={16} /></button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </aside>
                  </div>

                  <div className="pc-grid-3">
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">Предметы</h3><button type="button" className="btn btn-soft btn-sm" onClick={() => setTab('subjects')}>Подробнее</button></div>
                      {donutItems.length === 0 ? <p className="pc-muted-box">В этом периоде сессий по предметам не было.</p> : (
                        <div className="pc-donut-wrap">
                          <Donut items={donutItems} center={<><b className="t-num">{formatMinutes(donutTotal)}</b><span>в сессиях</span></>} />
                          <ul className="pc-legend">
                            {donutItems.slice(0, 5).map((d) => (
                              <li key={d.key}><i style={{ background: d.color }} /><span>{d.label}</span><b className="t-num">{Math.round((100 * d.value) / donutTotal)}%</b></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">Дни недели</h3>{ov.best_day && <span className="badge badge-violet">{ov.best_day}</span>}</div>
                      <HBars items={ov.weekdays.map((w) => ({ key: w.day, label: w.day, value: w.minutes }))} />
                    </div>
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">Время суток</h3>{ov.best_time && <span className="badge badge-sun">{ov.best_time} ч</span>}</div>
                      <HBars color="var(--sun-500)" items={ov.hours.map((h) => ({ key: h.time, label: h.time, value: h.minutes }))} />
                    </div>
                  </div>

                  <div className="pc-grid-2">
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">12 недель</h3><span className="t-muted t-small">рекорд серии — {ov.totals.longest_streak} {plural(ov.totals.longest_streak, 'день', 'дня', 'дней')}</span></div>
                      <Heatmap data={ov.heatmap} />
                    </div>
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">Ближайшие сессии</h3><button type="button" className="btn btn-soft btn-sm" onClick={() => openSessionModal()}><Plus size={15} /> Назначить</button></div>
                      {ov.upcoming.length === 0 ? <p className="pc-muted-box">Запланированных сессий нет. Назначьте одну — она появится у ученика в списке.</p> : (
                        <ul className="pc-upcoming">
                          {ov.upcoming.map((s) => (
                            <li key={s.id} style={{ '--c': s.subject_color }}>
                              <span className="pc-up-date"><b>{new Date(s.scheduled_at).getDate()}</b><small>{new Date(s.scheduled_at).toLocaleDateString('ru-RU', { month: 'short' })}</small></span>
                              <span className="pc-up-main"><b>{s.goal}</b><small>{s.subject_name} · {new Date(s.scheduled_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · {formatMinutes(s.duration_minutes)}</small></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* предметы */}
              {tab === 'subjects' && (subjectDetail ? (
                <SubjectDetail data={subjectDetail} onBack={() => setSubjectDetail(null)} onAssign={openSessionModal} />
              ) : (
                <div className="pc-tab-body page-enter">
                  {ov.subjects.length === 0 ? (
                    <EmptyState mood="curious" title="Предметов пока нет" text="Когда ученик добавит предметы в Studly, здесь появится статистика по каждому." />
                  ) : (
                    <div className="pc-subjects">
                      {subjectsSorted.map((s, i) => {
                        const stale = s.days_since !== null && s.days_since >= 7;
                        return (
                          <button key={s.id} type="button" className={`pc-subj-card ${subjectLoading === s.id ? 'is-loading' : ''}`} style={{ '--c': s.color, '--i': i }} onClick={() => openSubject(s.id)}>
                            <span className="pc-subj-top">
                              <span className="pc-subj-icon"><BookOpen size={18} /></span>
                              <span className="pc-subj-name">{s.name}</span>
                              <Delta value={s.change} />
                            </span>
                            <span className="pc-subj-mins">
                              <b className="t-num">{formatMinutes(s.period_minutes)}</b>
                              <small>за {ov.period_days} дн. · всего {formatMinutes(s.total_minutes)}</small>
                            </span>
                            <Spark data={s.spark} color={s.color} />
                            <span className="pc-subj-tasks">
                              <span className="progress"><span style={{ width: `${s.tasks.completion || 0}%`, '--c': s.color }} /></span>
                              <small>{s.tasks.total ? `${s.tasks.done} из ${s.tasks.total} задач` : 'задач нет'}{s.tasks.overdue ? ` · ${s.tasks.overdue} просроч.` : ''}</small>
                            </span>
                            <span className={`pc-subj-foot ${stale ? 'is-stale' : ''}`}>
                              {stale ? <AlarmClock size={14} /> : <Clock size={14} />} {daysAgo(s.days_since)}
                              <span className="pc-subj-go">Открыть <ChevronRight size={14} /></span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* задачи и цели */}
              {tab === 'progress' && (
                <div className="pc-tab-body page-enter">
                  <div className="pc-kpis">
                    <Kpi icon={ListChecks} tone="violet" label="Всего задач" value={ov.tasks.total} foot={`${ov.tasks.completion ?? 0}% выполнено`} />
                    <Kpi icon={CheckCircle2} tone="mint" label={`Закрыто за ${ov.period_days} дн.`} value={ov.tasks.done_period} />
                    <Kpi icon={Target} tone="sun" label="В работе" value={ov.tasks.open} foot={ov.tasks.high_open ? `${ov.tasks.high_open} с высоким приоритетом` : 'без срочных'} />
                    <Kpi icon={AlertTriangle} tone="rose" label="Просрочено" value={ov.tasks.overdue} foot={ov.tasks.overdue ? 'стоит обсудить' : 'всё в срок'} />
                  </div>

                  <div className="pc-grid-2">
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">Задачи по предметам</h3></div>
                      {ov.subjects.every((s) => !s.tasks.total) ? <p className="pc-muted-box">Задач пока нет.</p> : (
                        <ul className="pc-task-subjects">
                          {ov.subjects.filter((s) => s.tasks.total).map((s) => (
                            <li key={s.id} style={{ '--c': s.color }}>
                              <button type="button" onClick={() => openSubject(s.id)}>
                                <span className="pc-ts-name"><i />{s.name}</span>
                                <span className="pc-ts-bar">
                                  <span className="pc-ts-done" style={{ width: `${(100 * s.tasks.done) / s.tasks.total}%` }} />
                                  <span className="pc-ts-over" style={{ width: `${(100 * s.tasks.overdue) / s.tasks.total}%` }} />
                                </span>
                                <span className="pc-ts-val t-num">{s.tasks.done}/{s.tasks.total}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="card card-pad">
                      <div className="card-head"><h3 className="t-h2">Цели</h3><span className="t-muted t-small">{ov.goals.filter((g) => g.is_completed).length} из {ov.goals.length} выполнено</span></div>
                      {ov.goals.length === 0 ? <p className="pc-muted-box">Ученик пока не ставил целей. Можно предложить одну маленькую — например, 3 сессии на неделе.</p> : (
                        <ul className="pc-goals">
                          {ov.goals.map((g) => (
                            <li key={g.id} className={g.is_completed ? 'is-done' : g.is_expired ? 'is-expired' : ''}>
                              <Ring value={goalPercent(g)} size={46} stroke={5} color={g.is_completed ? 'var(--mint-500)' : g.is_expired ? 'var(--line-strong)' : g.color || 'var(--primary)'} />
                              <span className="pc-goal-main"><b>{g.title}</b><small>{g.current} из {g.target} · {GOAL_TYPES[g.type] || g.type}{g.is_expired ? ' · срок вышел' : ''}</small></span>
                              {g.is_completed && <CheckCircle2 size={18} className="c-mint" />}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="card card-pad">
                    <div className="card-head"><h3 className="t-h2">Награды</h3><span className="badge badge-sun"><Trophy size={13} /> {ov.achievements.unlocked} из {ov.achievements.total}</span></div>
                    <div className="pc-awards">
                      {ov.achievements.items.map((a) => (
                        <div key={a.id} className={`pc-award ${a.unlocked ? 'is-on' : ''}`} style={{ '--c': a.color || 'var(--primary)' }}>
                          <span className="pc-award-icon">{a.unlocked ? <Trophy size={20} /> : <Lock size={18} />}</span>
                          <b>{a.title}</b>
                          <small>{a.description}</small>
                          {!a.unlocked && <span className="progress"><span style={{ width: `${a.progress}%`, '--c': a.color || 'var(--primary)' }} /></span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* сессии */}
              {tab === 'sessions' && (
                <div className="pc-tab-body page-enter">
                  <div className="card card-pad">
                    <div className="card-head pc-sess-head">
                      <div className="pc-chips">
                        {SESSION_FILTERS.map((f) => (
                          <button key={f.id} type="button" className={`chip ${sessionFilter === f.id ? 'is-active' : ''}`} onClick={() => setSessionFilter(f.id)}>
                            {f.label} <span className="pc-chip-count t-num">{sessionCount(f.id)}</span>
                          </button>
                        ))}
                      </div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => openSessionModal()}><CalendarPlus size={16} /> Назначить</button>
                    </div>
                    {filteredSessions.length === 0 ? <p className="pc-muted-box">Здесь пока пусто.</p> : (
                      <ul className="pc-timeline">
                        {filteredSessions.slice(0, 40).map((s) => {
                          const missed = isMissed(s);
                          const status = missed ? 'missed' : s.status;
                          return (
                            <li key={s.id} className={`st-${status}`} style={{ '--c': s.subject_color }}>
                              <span className="pc-tl-dot" />
                              <div className="pc-tl-body">
                                <b>{s.goal}</b>
                                <span className="t-small">
                                  <span className="badge badge-subject" style={{ '--c': s.subject_color }}>{s.subject_name}</span>
                                  <span className="t-muted"> {fmtDateTime(s.completed_at || s.scheduled_at || s.created_at)} · {formatMinutes(s.duration_minutes)}</span>
                                </span>
                              </div>
                              <span className={`badge ${status === 'completed' ? 'badge-mint' : status === 'missed' ? 'badge-rose' : status === 'cancelled' ? 'badge-sun' : 'badge-violet'}`}>{missed ? 'Пропущена' : STATUS_LABELS[s.status] || s.status}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Добавить ученика" icon={UserPlus}
        subtitle="Код находится в разделе «Профиль» в аккаунте ученика">
        <form onSubmit={handleLinkChild} className="pr-form">
          <ol className="pc-steps">
            <li><span>1</span>Ученик открывает «Профиль»</li>
            <li><span>2</span>Нажимает «Создать код»</li>
            <li><span>3</span>Вы вводите код ниже</li>
          </ol>
          <input className={`input pr-code-input ${linkError ? 'is-error' : ''}`} placeholder="A1B2C3D4" value={inviteCode} maxLength={20}
            onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setLinkError(''); }} aria-label="Код приглашения" aria-invalid={!!linkError} autoComplete="off" />
          {linkError && <p className="field-error" role="alert">{linkError}</p>}
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={linking || !inviteCode.trim()}>{linking ? 'Проверяем…' : 'Добавить'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showSessionModal && !!selectedChild} onClose={() => setShowSessionModal(false)} icon={CalendarClock}
        accent={sessionSubjects.find((s) => String(s.id) === sessionForm.subject_id)?.color}
        title="Новая сессия" subtitle={`Для ученика ${selectedChild?.name || ''} — появится в его списке сессий`}>
        <form onSubmit={handleCreateSession} className="pr-form">
          <label className="field">
            <span className="field-label">Цель</span>
            <input className="input" value={sessionForm.goal} onChange={(e) => setSessionForm({ ...sessionForm, goal: e.target.value })} placeholder="Например: решить задачи 1–10" required />
          </label>
          <fieldset className="field pc-subj-pick">
            <legend className="field-label">Предмет</legend>
            <div className="pc-chips">
              <button type="button" className={`chip ${!sessionForm.subject_id ? 'is-active' : ''}`} onClick={() => setSessionForm({ ...sessionForm, subject_id: '' })}>Без предмета</button>
              {sessionSubjects.map((s) => (
                <button key={s.id} type="button" className={`chip ${sessionForm.subject_id === String(s.id) ? 'is-active' : ''}`} style={{ '--chip-c': s.color }}
                  onClick={() => setSessionForm({ ...sessionForm, subject_id: String(s.id) })} aria-pressed={sessionForm.subject_id === String(s.id)}>
                  <span className="chip-dot" />{s.name}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span className="field-label">Когда <span className="t-muted">(необязательно)</span></span>
            <input className="input" type="datetime-local" value={sessionForm.scheduled_at} onChange={(e) => setSessionForm({ ...sessionForm, scheduled_at: e.target.value })} />
          </label>
          <div className="pr-form-row">
            <label className="field">
              <span className="field-label">Интервал, мин</span>
              <input className="input" type="number" min="15" max="60" value={sessionForm.work_interval} onChange={(e) => setSessionForm({ ...sessionForm, work_interval: parseInt(e.target.value, 10) || 25 })} />
            </label>
            <label className="field">
              <span className="field-label">Интервалов</span>
              <input className="input" type="number" min="1" max="8" value={sessionForm.intervals_count} onChange={(e) => setSessionForm({ ...sessionForm, intervals_count: parseInt(e.target.value, 10) || 4 })} />
            </label>
          </div>
          <p className="pc-session-sum t-small"><Timer size={15} /> Итого {formatMinutes(sessionForm.work_interval * sessionForm.intervals_count)} фокуса</p>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setShowSessionModal(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={!sessionForm.goal.trim()}>Назначить сессию</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={unlinkModal.open}
        title="Отвязать ученика?"
        message={unlinkModal.child ? `Вы перестанете видеть статистику ${unlinkModal.child.name}. Привязать снова можно по новому коду.` : ''}
        confirmText="Отвязать"
        cancelText="Отмена"
        onConfirm={handleUnlinkConfirm}
        onCancel={() => setUnlinkModal({ open: false, child: null })}
        variant="danger"
      />
      {toast}
    </AppLayout>
  );
};

export default ParentCabinetPage;
