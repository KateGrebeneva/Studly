import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Target, Play, Trash2, ChevronLeft, ChevronRight, CalendarClock, CalendarPlus, Repeat, Timer } from 'lucide-react';
import { sessionsAPI, subjectsAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import AppLayout from './AppLayout';
import { PageHeader, EmptyState, Modal, Mascot, useToast, formatMinutes, plural, STATUS_LABELS } from './ui';
import './SessionPlanningPage.css';

const PRESETS = [
  { work: 25, short: 5, long: 15, count: 4, label: 'Классика', hint: '25 / 5' },
  { work: 30, short: 10, long: 20, count: 4, label: 'Удлинённый', hint: '30 / 10' },
  { work: 45, short: 15, long: 30, count: 3, label: 'Глубокий фокус', hint: '45 / 15' },
  { work: 15, short: 3, long: 10, count: 5, label: 'Быстрый', hint: '15 / 3' },
];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const EMPTY_FORM = { goal: '', subjectId: '', workInterval: 25, shortBreak: 5, longBreak: 15, intervalsCount: 4, customIntervals: false };

const RhythmBar = ({ work, short, count }) => (
  <span className="ss-rhythm" aria-hidden="true">
    {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
      <React.Fragment key={i}>
        <i className="w" style={{ flex: work }} />
        {i < Math.min(count, 5) - 1 && <i className="b" style={{ flex: short }} />}
      </React.Fragment>
    ))}
  </span>
);

const SessionPlanningPage = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState('form');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [deleteSessionModal, setDeleteSessionModal] = useState({ open: false, session: null });
  const [toast, showToast] = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sess, subs] = await Promise.all([sessionsAPI.getAll(), subjectsAPI.getAll()]);
        setSessions(sess || []);
        setSubjects(subs || []);
      } catch (e) {
        console.error(e);
        showToast('Не удалось загрузить сессии. Проверь подключение к серверу.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const openForm = () => { setStep('form'); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setStep('form'); };

  const handlePresetSelect = (p) => setFormData({ ...formData, workInterval: p.work, shortBreak: p.short, longBreak: p.long, intervalsCount: p.count, customIntervals: false });

  const payload = () => ({
    goal: formData.goal.trim(),
    subject_id: parseInt(formData.subjectId, 10) || null,
    work_interval: formData.workInterval,
    short_break: formData.shortBreak,
    long_break: formData.longBreak,
    intervals_count: formData.intervalsCount,
  });

  const validate = () => {
    if (!formData.goal.trim() || !formData.subjectId) {
      showToast('Заполни цель и выбери предмет', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const created = await sessionsAPI.create(payload());
      setSessions([created, ...sessions]);
      closeForm();
      setFormData(EMPTY_FORM);
      showToast('Сессия создана');
    } catch (err) {
      showToast(err.message || 'Не удалось создать сессию', 'error');
    }
  };

  const handleScheduleSession = async () => {
    if (!validate()) return;
    if (!selectedTime) { showToast('Выбери время начала', 'error'); return; }
    const [hours, minutes] = selectedTime.split(':');
    const when = new Date(selectedDate);
    when.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    try {
      const created = await sessionsAPI.create({ ...payload(), scheduled_at: when.toISOString() });
      setSessions([created, ...sessions]);
      showToast(`Запланировано на ${when.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`);
      closeForm();
      setSelectedTime('');
      setFormData(EMPTY_FORM);
    } catch (err) {
      showToast(err.message || 'Не удалось запланировать', 'error');
    }
  };

  const handleDeleteSessionConfirm = async () => {
    if (!deleteSessionModal.session) return;
    try {
      await sessionsAPI.delete(deleteSessionModal.session.id);
      setSessions((prev) => prev.filter((s) => s.id !== deleteSessionModal.session.id));
      showToast('Сессия удалена');
      setDeleteSessionModal({ open: false, session: null });
    } catch (err) {
      showToast(err.message || 'Не удалось удалить сессию', 'error');
    }
  };

  const getCalendarDays = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const total = new Date(y, m + 1, 0).getDate();
    const pad = first.getDay() === 0 ? 6 : first.getDay() - 1;
    return [...Array(pad).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  };
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const grouped = useMemo(() => {
    const open = sessions.filter((s) => s.status !== 'completed' && s.status !== 'cancelled');
    const done = sessions.filter((s) => s.status === 'completed');
    const sortBy = (arr, key, dir = 1) => arr.slice().sort((a, b) => {
      const va = a[key] ? new Date(a[key]).getTime() : Infinity * dir;
      const vb = b[key] ? new Date(b[key]).getTime() : Infinity * dir;
      return (va - vb) * dir;
    });
    return {
      upcoming: sortBy(open, 'scheduled_at'),
      done: sortBy(done, 'completed_at', -1),
      all: sessions,
    };
  }, [sessions]);

  const list = grouped[filter] || [];
  const totalWork = formData.workInterval * formData.intervalsCount;
  const subjectName = subjects.find((s) => String(s.id) === String(formData.subjectId))?.name;

  return (
    <AppLayout>
      <PageHeader
        title="Сессии"
        subtitle="Pomodoro-сессии с понятной целью: работай интервалами и отдыхай вовремя"
        actions={<button type="button" className="btn btn-primary" onClick={openForm}><Plus size={18} /> Новая сессия</button>}
      />

      <div className="ss-toolbar rise rise-1">
        <div className="segmented" role="tablist" aria-label="Фильтр сессий">
          {[
            ['upcoming', `Предстоящие · ${grouped.upcoming.length}`],
            ['done', `Завершённые · ${grouped.done.length}`],
            ['all', 'Все'],
          ].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'is-active' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ss-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 190 }} />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          mood={filter === 'done' ? 'think' : 'sleep'}
          mascotWidth={120}
          title={filter === 'done' ? 'Завершённых сессий пока нет' : 'Нет запланированных сессий'}
          text={filter === 'done' ? 'Запусти таймер в любой сессии — после неё здесь появится история.' : 'Поставь цель на 25 минут, выбери предмет — и можно начинать.'}
          actions={<button type="button" className="btn btn-primary" onClick={openForm}><Plus size={18} /> Создать сессию</button>}
        />
      ) : (
        <div className="ss-grid">
          {list.map((s, i) => {
            const c = s.subject_color || 'var(--primary)';
            const when = s.status === 'completed' ? s.completed_at : s.scheduled_at;
            const overdue = s.status !== 'completed' && s.scheduled_at && new Date(s.scheduled_at) < todayStart;
            return (
              <article key={s.id} className={`ss-card rise rise-${Math.min(i + 1, 6)} ${s.status === 'completed' ? 'is-done' : ''}`} style={{ '--c': c }}>
                <div className="ss-card-top">
                  <span className="badge badge-subject" style={{ '--c': c }}>{s.subject_name || 'Общее'}</span>
                  <span className={`badge ${s.status === 'completed' ? 'badge-mint' : overdue ? 'badge-rose' : 'badge-violet'}`}>
                    {overdue ? 'Просрочена' : (STATUS_LABELS[s.status] || s.status)}
                  </span>
                </div>
                <h3 className="ss-goal">{s.goal}</h3>
                <RhythmBar work={s.work_interval || 25} short={s.short_break || 5} count={s.intervals_count || 4} />
                <dl className="ss-meta">
                  <div><dt><Repeat size={14} /></dt><dd>{s.intervals_count} × {s.work_interval}/{s.short_break} мин</dd></div>
                  <div><dt><Clock size={14} /></dt><dd>{formatMinutes(s.duration_minutes || (s.work_interval * s.intervals_count))}</dd></div>
                  <div className="ss-when"><dt><CalendarClock size={14} /></dt><dd>{when ? new Date(when).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Без даты'}</dd></div>
                </dl>
                <div className="ss-actions">
                  {s.status !== 'completed' && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/pomodoro?session=${s.id}`)}>
                      <Play size={15} /> Начать
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-icon btn-sm ss-del" onClick={() => setDeleteSessionModal({ open: true, session: s })} aria-label={`Удалить сессию ${s.goal}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
          {filter === 'upcoming' && (
            <button type="button" className="ss-add-tile rise" onClick={openForm}>
              <Mascot variant="full" pose="playful" mood="idle" decorative />
              <span className="ss-add-plus"><Plus size={20} /></span>
              <b>Новая сессия</b>
              <small>Одна цель · 25 минут фокуса</small>
            </button>
          )}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        wide
        icon={step === 'form' ? Timer : CalendarClock}
        title={step === 'form' ? 'Новая Pomodoro-сессия' : 'Когда начнём?'}
        subtitle={step === 'form' ? 'Одна цель, один предмет, понятный ритм' : `${formData.goal} · ${subjectName || ''}`}
      >
        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="ss-form">
            <label className="field">
              <span className="field-label">Цель сессии</span>
              <input className="input" placeholder="Например: разобрать производные сложной функции" value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })} required />
            </label>
            <label className="field">
              <span className="field-label">Предмет</span>
              <select className="select" value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })} required>
                <option value="">Выбери предмет</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {subjects.length === 0 && (
                <span className="field-hint">Предметов пока нет — <button type="button" className="ss-link" onClick={() => navigate('/subjects')}>добавь первый</button>.</span>
              )}
            </label>

            <fieldset className="field ss-presets-field">
              <legend className="field-label">Ритм</legend>
              <div className="ss-presets">
                {PRESETS.map((p) => {
                  const active = !formData.customIntervals && formData.workInterval === p.work && formData.shortBreak === p.short;
                  return (
                    <button key={p.label} type="button" className={`ss-preset ${active ? 'is-active' : ''}`} onClick={() => handlePresetSelect(p)} aria-pressed={active}>
                      <span className="ss-preset-label">{p.label}</span>
                      <span className="ss-preset-hint t-num">{p.hint} мин · ×{p.count}</span>
                      <RhythmBar work={p.work} short={p.short} count={p.count} />
                    </button>
                  );
                })}
              </div>
              <button type="button" className={`chip ss-custom ${formData.customIntervals ? 'is-active' : ''}`}
                onClick={() => setFormData({ ...formData, customIntervals: !formData.customIntervals })} aria-expanded={formData.customIntervals}>
                Свои интервалы
              </button>
            </fieldset>

            {formData.customIntervals && (
              <div className="ss-custom-grid">
                {[
                  ['workInterval', 'Работа, мин', 5, 60],
                  ['shortBreak', 'Короткий перерыв', 1, 30],
                  ['longBreak', 'Длинный перерыв', 5, 60],
                  ['intervalsCount', 'Интервалов', 1, 10],
                ].map(([k, l, min, max]) => (
                  <label key={k} className="field">
                    <span className="field-label">{l}</span>
                    <input className="input" type="number" min={min} max={max} value={formData[k]}
                      onChange={(e) => setFormData({ ...formData, [k]: parseInt(e.target.value, 10) || min })} />
                  </label>
                ))}
              </div>
            )}

            <p className="ss-summary">Итого {formatMinutes(totalWork)} фокуса — {formData.intervalsCount} {plural(formData.intervalsCount, 'интервал', 'интервала', 'интервалов')} по {formData.workInterval} мин.</p>

            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={closeForm}>Отмена</button>
              <button type="button" className="btn btn-soft" onClick={() => { if (validate()) setStep('schedule'); }}>
                <CalendarPlus size={17} /> Запланировать
              </button>
              <button type="submit" className="btn btn-primary"><Target size={17} /> Создать сессию</button>
            </div>
          </form>
        ) : (
          <div className="ss-schedule">
            <div className="ss-cal">
              <div className="ss-cal-head">
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Предыдущий месяц" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}><ChevronLeft size={18} /></button>
                <b>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</b>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Следующий месяц" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}><ChevronRight size={18} /></button>
              </div>
              <div className="ss-cal-grid">
                {WEEK.map((d) => <span key={d} className="ss-cal-wd">{d}</span>)}
                {getCalendarDays().map((day, idx) => {
                  if (!day) return <span key={`e${idx}`} />;
                  const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const past = d < todayStart;
                  return (
                    <button key={day} type="button" disabled={past}
                      className={`ss-cal-day ${isSameDay(d, new Date()) ? 'is-today' : ''} ${isSameDay(d, selectedDate) ? 'is-selected' : ''}`}
                      onClick={() => setSelectedDate(d)} aria-pressed={isSameDay(d, selectedDate)}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ss-time">
              <label className="field">
                <span className="field-label">Время начала</span>
                <input type="time" className="input ss-time-input" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
              </label>
              <div className="ss-time-quick">
                {['09:00', '15:00', '17:30', '19:00'].map((t) => (
                  <button key={t} type="button" className={`chip ${selectedTime === t ? 'is-active' : ''}`} onClick={() => setSelectedTime(t)}>{t}</button>
                ))}
              </div>
              <div className="ss-time-preview">
                <span className="t-muted t-small">Сессия начнётся</span>
                <b>{selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}{selectedTime ? `, ${selectedTime}` : ''}</b>
                <span className="t-muted t-small">{formData.intervalsCount} × {formData.workInterval} мин · {formatMinutes(totalWork)}</span>
              </div>
            </div>
            <div className="modal-foot ss-schedule-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setStep('form')}><ChevronLeft size={17} /> Назад</button>
              <button type="button" className="btn btn-primary" onClick={handleScheduleSession}><CalendarPlus size={17} /> Запланировать</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={deleteSessionModal.open}
        title="Удалить сессию?"
        message={deleteSessionModal.session ? `«${deleteSessionModal.session.goal}» будет удалена без возможности восстановления.` : ''}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteSessionConfirm}
        onCancel={() => setDeleteSessionModal({ open: false, session: null })}
        variant="danger"
      />
      {toast}
    </AppLayout>
  );
};

export default SessionPlanningPage;
