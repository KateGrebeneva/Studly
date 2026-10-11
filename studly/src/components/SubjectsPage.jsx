import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, Clock, Play, X, BookOpen } from 'lucide-react';
import { subjectsAPI, tasksAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import AppLayout from './AppLayout';
import { PageHeader, EmptyState, Modal, formatMinutes, plural } from './ui';
import './SubjectsPage.css';

const COLOR_GROUPS = [
  { color: '#ff6b6b', label: 'Важные / школьные', category: 'important' },
  { color: '#f59e0b', label: 'Хобби', category: 'hobby' },
  { color: '#7012CE', label: 'Основные предметы', category: 'main' },
  { color: '#4ecdc4', label: 'Дополнительные', category: 'additional' },
  { color: '#4facfe', label: 'Проекты', category: 'projects' },
  { color: '#f093fb', label: 'Личное развитие', category: 'personal' },
  { color: '#00f2fe', label: 'Спорт / здоровье', category: 'health' },
];

const PRIORITIES = [
  { value: 'low', label: 'Низкий', badge: 'badge' },
  { value: 'medium', label: 'Средний', badge: 'badge badge-sun' },
  { value: 'high', label: 'Высокий', badge: 'badge badge-rose' },
];

const SubjectsPage = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [tasksBySubject, setTasksBySubject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#7012CE');
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [filterColor, setFilterColor] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, subject: null });
  const [deleteTaskModal, setDeleteTaskModal] = useState({ open: false, subject: null, task: null });
  const [justDone, setJustDone] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const subs = await subjectsAPI.getAll();
      setSubjects(subs);
      const tasksMap = {};
      for (const s of subs) {
        // eslint-disable-next-line no-await-in-loop
        tasksMap[s.id] = await tasksAPI.getBySubject(s.id);
      }
      setTasksBySubject(tasksMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddSubject = async (e) => {
    e?.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const created = await subjectsAPI.create({
        name: newSubjectName.trim(),
        color: newSubjectColor,
        category: COLOR_GROUPS.find((g) => g.color === newSubjectColor)?.category || null,
      });
      setSubjects([created, ...subjects]);
      setTasksBySubject({ ...tasksBySubject, [created.id]: [] });
      setNewSubjectName('');
      setShowAddSubject(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSubjectConfirm = async () => {
    if (!deleteModal.subject) return;
    try {
      await subjectsAPI.delete(deleteModal.subject.id);
      setSubjects(subjects.filter((s) => s.id !== deleteModal.subject.id));
      const { [deleteModal.subject.id]: _removed, ...rest } = tasksBySubject;
      setTasksBySubject(rest);
      setDeleteModal({ open: false, subject: null });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleTask = async (subjectId, taskId) => {
    const tasks = tasksBySubject[subjectId] || [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await tasksAPI.update(taskId, { is_completed: !task.is_completed });
      setTasksBySubject({
        ...tasksBySubject,
        [subjectId]: tasks.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)),
      });
      if (!task.is_completed) {
        setJustDone(taskId);
        setTimeout(() => setJustDone(null), 900);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTaskConfirm = async () => {
    if (!deleteTaskModal.task || !deleteTaskModal.subject) return;
    try {
      await tasksAPI.delete(deleteTaskModal.task.id);
      setTasksBySubject((prev) => ({
        ...prev,
        [deleteTaskModal.subject.id]: (prev[deleteTaskModal.subject.id] || []).filter((t) => t.id !== deleteTaskModal.task.id),
      }));
      setDeleteTaskModal({ open: false, subject: null, task: null });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTask = async (e, subjectId) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const created = await tasksAPI.create({ subject_id: subjectId, title: newTaskTitle.trim(), priority: newTaskPriority });
      setTasksBySubject({ ...tasksBySubject, [subjectId]: [...(tasksBySubject[subjectId] || []), created] });
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setEditingTask(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelTask = () => { setEditingTask(null); setNewTaskTitle(''); setNewTaskPriority('medium'); };

  const filteredSubjects = subjects.filter((s) => filterColor === 'all' || s.color === filterColor);
  const allTasks = Object.values(tasksBySubject).flat();
  const doneTasks = allTasks.filter((t) => t.is_completed).length;
  const usedColors = new Set(subjects.map((s) => s.color));

  return (
    <AppLayout>
      <PageHeader
        title="Предметы и задачи"
        subtitle={subjects.length
          ? `${subjects.length} ${plural(subjects.length, 'предмет', 'предмета', 'предметов')} · выполнено ${doneTasks} из ${allTasks.length} ${plural(allTasks.length, 'задачи', 'задач', 'задач')}`
          : 'Собери всё, что изучаешь, в одном месте'}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => navigate('/sessions')}><Play size={17} /> Начать сессию</button>
            <button type="button" className="btn btn-primary" onClick={() => setShowAddSubject(true)}><Plus size={18} /> Добавить предмет</button>
          </>
        )}
      />

      {error && <div className="alert alert-error sj-alert" role="alert">{error}</div>}

      {subjects.length > 0 && (
        <div className="sj-filter rise rise-1" role="group" aria-label="Фильтр по категориям">
          <button type="button" className={`chip ${filterColor === 'all' ? 'is-active' : ''}`} onClick={() => setFilterColor('all')}>Все</button>
          {COLOR_GROUPS.filter((g) => usedColors.has(g.color)).map((g) => (
            <button
              type="button"
              key={g.color}
              className={`chip ${filterColor === g.color ? 'is-active' : ''}`}
              style={{ '--chip-c': g.color }}
              onClick={() => setFilterColor(g.color)}
            >
              <span className="chip-dot" />{g.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="sj-grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}</div>
      ) : subjects.length === 0 ? (
        <EmptyState
          mood="curious"
          mascotWidth={120}
          title="Здесь появятся твои предметы"
          text="Начни с одного: математика, английский или что-то для души. Внутри каждого предмета можно вести список задач."
          actions={<button type="button" className="btn btn-primary" onClick={() => setShowAddSubject(true)}><Plus size={18} /> Добавить первый предмет</button>}
        />
      ) : (
        <div className="sj-grid">
          {filteredSubjects.map((subject, idx) => {
            const tasks = tasksBySubject[subject.id] || [];
            const completed = tasks.filter((t) => t.is_completed).length;
            const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
            const category = COLOR_GROUPS.find((g) => g.color === subject.color);
            return (
              <article key={subject.id} className={`sj-card rise rise-${Math.min(idx + 1, 6)}`} style={{ '--c': subject.color }}>
                <header className="sj-card-head">
                  <div className="sj-card-ring" aria-hidden="true">
                    <svg viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" className="trk" />
                      <circle cx="24" cy="24" r="20" className="val" style={{ strokeDashoffset: 125.6 * (1 - pct / 100) }} />
                    </svg>
                    <span className="t-num">{pct}%</span>
                  </div>
                  <div className="sj-card-title">
                    <h2>{subject.name}</h2>
                    <p>
                      {category && <span>{category.label}</span>}
                      <span><Clock size={13} /> {formatMinutes(subject.time_studied_minutes || 0)}</span>
                      <span><Check size={13} /> {completed}/{tasks.length}</span>
                    </p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm sj-del" onClick={() => setDeleteModal({ open: true, subject })} aria-label={`Удалить предмет ${subject.name}`}>
                    <Trash2 size={17} />
                  </button>
                </header>

                <ul className="sj-tasks">
                  {tasks.length === 0 && <li className="sj-no-tasks">Задач пока нет — добавь первую.</li>}
                  {tasks.map((task) => {
                    const pr = PRIORITIES.find((p) => p.value === (task.priority || 'medium')) || PRIORITIES[1];
                    return (
                      <li key={task.id} className={`sj-task ${task.is_completed ? 'is-done' : ''} ${justDone === task.id ? 'is-pop' : ''}`}>
                        <button
                          type="button"
                          className="sj-check"
                          onClick={() => handleToggleTask(subject.id, task.id)}
                          aria-pressed={!!task.is_completed}
                          aria-label={task.is_completed ? `Вернуть задачу «${task.title}»` : `Отметить выполненной «${task.title}»`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <span className="sj-task-title">{task.title}</span>
                        <span className="sj-task-end">
                          {task.priority && <span className={`${pr.badge} sj-task-pr`}>{pr.label}</span>}
                          <button type="button" className="btn btn-ghost btn-icon btn-sm sj-task-del" onClick={() => setDeleteTaskModal({ open: true, subject, task })} aria-label={`Удалить задачу ${task.title}`}>
                            <X size={15} />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {editingTask === subject.id ? (
                  <form className="sj-add-task" onSubmit={(e) => handleAddTask(e, subject.id)}>
                    <input
                      className="input"
                      placeholder="Что нужно сделать?"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      autoFocus
                      aria-label="Название задачи"
                    />
                    <div className="sj-add-row">
                      <div className="segmented" role="radiogroup" aria-label="Приоритет">
                        {PRIORITIES.map((p) => (
                          <button key={p.value} type="button" role="radio" aria-checked={newTaskPriority === p.value}
                            className={newTaskPriority === p.value ? 'is-active' : ''} onClick={() => setNewTaskPriority(p.value)}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="sj-add-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelTask}>Отмена</button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={!newTaskTitle.trim()}>Добавить</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <button type="button" className="sj-add-btn" onClick={() => { setEditingTask(subject.id); setNewTaskTitle(''); }}>
                    <Plus size={16} /> Добавить задачу
                  </button>
                )}
              </article>
            );
          })}
          {filteredSubjects.length === 0 && (
            <EmptyState mood="think" title="В этой категории пусто" text="Выбери другую категорию или покажи все предметы."
              actions={<button type="button" className="btn btn-soft btn-sm" onClick={() => setFilterColor('all')}>Показать все</button>} />
          )}
        </div>
      )}

      <Modal
        open={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        title="Новый предмет"
        subtitle="Цвет помогает отличать предметы в плане и статистике"
        icon={BookOpen}
        accent={newSubjectColor}
      >
        <form onSubmit={handleAddSubject} className="sj-form">
          <div className="sj-preview" style={{ '--c': newSubjectColor }} aria-hidden="true">
            <span className="sj-preview-icon"><BookOpen size={20} /></span>
            <span className="sj-preview-text">
              <b>{newSubjectName.trim() || 'Название предмета'}</b>
              <small>{COLOR_GROUPS.find((g) => g.color === newSubjectColor)?.label || 'Категория'} · 0 задач</small>
            </span>
          </div>
          <label className="field">
            <span className="field-label">Название</span>
            <input className="input" placeholder="Например, Алгебра" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
          </label>
          <fieldset className="field sj-colors">
            <legend className="field-label">Категория</legend>
            <div className="sj-color-grid">
              {COLOR_GROUPS.map((g) => (
                <label key={g.color} className={`sj-color ${newSubjectColor === g.color ? 'is-active' : ''}`} style={{ '--c': g.color }}>
                  <input type="radio" name="subject-color" value={g.color} checked={newSubjectColor === g.color} onChange={() => setNewSubjectColor(g.color)} className="visually-hidden" />
                  <span className="sj-color-dot" />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddSubject(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={!newSubjectName.trim()}>Сохранить предмет</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Удалить предмет?"
        message={deleteModal.subject ? `«${deleteModal.subject.name}» и все его задачи будут удалены.` : ''}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteSubjectConfirm}
        onCancel={() => setDeleteModal({ open: false, subject: null })}
        variant="danger"
      />
      <ConfirmModal
        isOpen={deleteTaskModal.open}
        title="Удалить задачу?"
        message={deleteTaskModal.task ? `«${deleteTaskModal.task.title}» исчезнет из списка.` : ''}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteTaskConfirm}
        onCancel={() => setDeleteTaskModal({ open: false, subject: null, task: null })}
        variant="danger"
      />
    </AppLayout>
  );
};

export default SubjectsPage;
