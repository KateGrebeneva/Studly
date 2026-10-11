import React, { useState, useEffect } from 'react';
import { Trophy, Target, Plus, Lock, Clock, Zap, Flame, CheckCircle2, BookMarked, Check, Trash2, X } from 'lucide-react';
import { achievementsAPI, goalsAPI } from '../services/api';
import AppLayout from './AppLayout';
import ConfirmModal from './ConfirmModal';
import { PageHeader, Mascot, Modal, EmptyState, useToast, Spots } from './ui';
import './AchievementsPage.css';

const ICONS = { Zap, Flame, Clock, CheckCircle2, BookMarked, Trophy };
const TYPE_LABEL = { daily: 'На день', weekly: 'На неделю', monthly: 'На месяц' };
const GOAL_COLORS = ['#7d4ff0', '#5b82c9', '#2fb58c', '#f2a93b', '#e8566b'];
const EMPTY_GOAL = { title: '', type: 'daily', target_value: 3, color: '#7d4ff0' };

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalModal, setGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [ach, gls] = await Promise.all([achievementsAPI.getAll(), goalsAPI.getAll()]);
        setAchievements(ach || []);
        setGoals(gls || []);
      } catch (e) {
        console.error(e);
        showToast('Не удалось загрузить цели и достижения', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const createGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim() || !goalForm.target_value) return;
    setSaving(true);
    try {
      const created = await goalsAPI.create({ ...goalForm, title: goalForm.title.trim(), target_value: Number(goalForm.target_value) });
      setGoals((prev) => [created, ...prev]);
      setGoalModal(false);
      setGoalForm(EMPTY_GOAL);
      showToast('Цель добавлена');
    } catch (err) {
      showToast(err.message || 'Не удалось создать цель', 'error');
    } finally {
      setSaving(false);
    }
  };

  const bumpGoal = async (goal) => {
    const next = Math.min((goal.current_value ?? 0) + 1, goal.target_value || 1);
    const done = next >= (goal.target_value || 1);
    try {
      const updated = await goalsAPI.update(goal.id, { current_value: next, ...(done ? { is_completed: true } : {}) });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, ...updated } : g)));
      if (done) showToast(`Цель «${goal.title}» выполнена!`);
    } catch (err) {
      showToast(err.message || 'Не удалось обновить цель', 'error');
    }
  };

  const [goalToDelete, setGoalToDelete] = useState(null);
  const removeGoal = (goal) => setGoalToDelete(goal);
  const confirmRemoveGoal = async () => {
    const goal = goalToDelete;
    if (!goal) return;
    try {
      await goalsAPI.delete(goal.id);
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      setGoalToDelete(null);
      showToast('Цель удалена');
    } catch (err) {
      showToast(err.message || 'Не удалось удалить цель', 'error');
    }
  };

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked).sort((a, b) => (b.progress || 0) - (a.progress || 0));
  const nextUp = locked[0];
  const activeGoals = goals.filter((g) => !g.is_completed && !g.is_expired);
  const doneGoals = goals.filter((g) => g.is_completed);
  const expiredGoals = goals.filter((g) => !g.is_completed && g.is_expired);

  return (
    <AppLayout>
      <PageHeader
        title="Цели и награды"
        subtitle="Ставь цели на день, неделю или месяц и собирай достижения за регулярность"
        actions={<button type="button" className="btn btn-primary" onClick={() => setGoalModal(true)}><Plus size={18} /> Новая цель</button>}
      />

      {/* полка наград */}
      <section className="ac-hero panel-violet rise">
        <Spots set="b" opacity={0.1} />
        <div className="ac-hero-text">
          <p className="ac-hero-kicker">Коллекция Спота</p>
          <p className="ac-hero-count"><b className="t-num">{unlocked.length}</b><span>/ {achievements.length || '—'}</span></p>
          <p className="ac-hero-sub">{achievements.length ? 'достижений открыто' : 'достижения появятся здесь'}</p>
          {nextUp && (
            <div className="ac-next">
              <span>Ближе всего: <b>{nextUp.title}</b></span>
              <div className="ac-next-bar"><span style={{ width: `${nextUp.progress || 0}%` }} /></div>
              <small className="t-num">{nextUp.progress || 0}%</small>
            </div>
          )}
        </div>
        <Mascot variant="bust" pose={unlocked.length ? 'thumbs' : 'shy'} mood="idle" className="ac-hero-mascot" decorative />
      </section>

      {/* цели */}
      <section className="ac-section">
        <div className="ac-section-head">
          <h2 className="t-h2"><Target size={20} /> Активные цели</h2>
        </div>
        {loading ? (
          <div className="ac-goals">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}</div>
        ) : activeGoals.length === 0 ? (
          <EmptyState mood="think" title="Активных целей нет"
            text="Например: «60 минут учёбы в день» или «5 сессий за неделю». Цель помогает не терять ритм."
            actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setGoalModal(true)}><Plus size={16} /> Поставить цель</button>} />
        ) : (
          <div className="ac-goals">
            {activeGoals.map((g, i) => {
              const cur = g.current_value ?? 0;
              const target = g.target_value || 1;
              const pct = Math.min(100, Math.round((cur / target) * 100));
              return (
                <article key={g.id} className={`ac-goal rise rise-${Math.min(i + 1, 6)}`} style={{ '--c': g.color || 'var(--primary)' }}>
                  <div className="ac-goal-top">
                    <span className="badge badge-subject" style={{ '--c': g.color || 'var(--primary)' }}>{TYPE_LABEL[g.type] || g.type}</span>
                    <span className="ac-goal-top-right">
                      <span className="ac-goal-pct t-num">{pct}%</span>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm ac-goal-del" onClick={() => removeGoal(g)} aria-label={`Удалить цель ${g.title}`}><Trash2 size={15} /></button>
                    </span>
                  </div>
                  <h3>{g.title}</h3>
                  <div className="progress"><span style={{ width: `${pct}%`, '--c': g.color || 'var(--primary)' }} /></div>
                  <div className="ac-goal-foot">
                    <span className="t-num"><b>{cur}</b> из {target}</span>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => bumpGoal(g)} aria-label={`Добавить прогресс к цели ${g.title}`}><Plus size={15} /> 1</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {doneGoals.length > 0 && (
          <div className="ac-done-goals" aria-label="Выполненные цели">
            {doneGoals.map((g) => <span key={g.id} className="badge badge-mint"><Check size={13} /> {g.title}</span>)}
          </div>
        )}
        {expiredGoals.length > 0 && (
          <div className="ac-done-goals" aria-label="Просроченные цели">
            <span className="t-muted t-small">Период закончился:</span>
            {expiredGoals.map((g) => (
              <span key={g.id} className="badge ac-expired">
                {g.title} · {g.current_value ?? 0}/{g.target_value}
                <button type="button" onClick={() => removeGoal(g)} aria-label={`Удалить цель ${g.title}`}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* достижения */}
      <section className="ac-section">
        <div className="ac-section-head">
          <h2 className="t-h2"><Trophy size={20} /> Достижения</h2>
        </div>
        {loading ? (
          <div className="ac-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 190 }} />)}</div>
        ) : (
          <div className="ac-grid">
            {[...unlocked, ...locked].map((a, i) => {
              const Icon = ICONS[a.icon_name] || Trophy;
              return (
                <article key={a.id} className={`ac-badge ${a.unlocked ? 'is-on' : 'is-off'} rise rise-${Math.min(i + 1, 6)}`} style={{ '--c': a.color || 'var(--primary)' }}>
                  <div className="ac-medal" aria-hidden="true">
                    <Icon size={28} />
                    {!a.unlocked && <span className="ac-lock"><Lock size={12} /></span>}
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                  {a.unlocked ? (
                    <span className="ac-date">{a.unlocked_at ? `Получено ${new Date(a.unlocked_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : 'Получено'}</span>
                  ) : (
                    <div className="ac-prog">
                      <div className="progress"><span style={{ width: `${a.progress || 0}%`, '--c': a.color || 'var(--primary)' }} /></div>
                      <small className="t-num">{a.progress || 0}%</small>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal open={goalModal} onClose={() => setGoalModal(false)} title="Новая цель" icon={Target} accent="var(--sun-500)" subtitle="Маленькая и конкретная цель работает лучше большой и размытой">
        <form className="ac-form" onSubmit={createGoal}>
          <label className="field">
            <span className="field-label">Что хочешь сделать?</span>
            <input className="input" placeholder="Например: 5 Pomodoro-сессий" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
          </label>
          <div className="ac-form-row">
            <div className="field">
              <span className="field-label">Период</span>
              <div className="segmented" role="radiogroup" aria-label="Период">
                {Object.entries(TYPE_LABEL).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={goalForm.type === k} className={goalForm.type === k ? 'is-active' : ''} onClick={() => setGoalForm({ ...goalForm, type: k })}>{l}</button>
                ))}
              </div>
            </div>
            <label className="field ac-target">
              <span className="field-label">Сколько раз</span>
              <input className="input" type="number" min="1" max="1000" value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })} />
            </label>
          </div>
          <div className="field">
            <span className="field-label">Цвет</span>
            <div className="ac-colors" role="radiogroup" aria-label="Цвет цели">
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={goalForm.color === c} aria-label={`Цвет ${c}`}
                  className={`ac-color ${goalForm.color === c ? 'is-active' : ''}`} style={{ '--c': c }} onClick={() => setGoalForm({ ...goalForm, color: c })} />
              ))}
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setGoalModal(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !goalForm.title.trim()}>{saving ? 'Сохраняю…' : 'Поставить цель'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!goalToDelete}
        title="Удалить цель?"
        message={goalToDelete ? `«${goalToDelete.title}» и её прогресс (${goalToDelete.current_value || 0} из ${goalToDelete.target_value}) исчезнут.` : ''}
        confirmText="Удалить"
        cancelText="Оставить"
        onConfirm={confirmRemoveGoal}
        onCancel={() => setGoalToDelete(null)}
        variant="danger"
      />
      {toast}
    </AppLayout>
  );
};

export default AchievementsPage;
