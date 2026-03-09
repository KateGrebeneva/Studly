import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, CheckCircle2, Circle, Home, Calendar, TrendingUp, User, Clock, Play, Sparkles } from 'lucide-react';
import { subjectsAPI, tasksAPI } from '../services/api';
import ConfirmModal from './ConfirmModal';
import './SubjectsPage.css';

const SubjectsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
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

  const colorGroups = [
    { color: '#ff6b6b', label: 'Важные/Школьные', category: 'important' },
    { color: '#f59e0b', label: 'Хобби', category: 'hobby' },
    { color: '#7012CE', label: 'Основные предметы', category: 'main' },
    { color: '#4ecdc4', label: 'Дополнительные', category: 'additional' },
    { color: '#4facfe', label: 'Проекты', category: 'projects' },
    { color: '#f093fb', label: 'Личное развитие', category: 'personal' },
    { color: '#00f2fe', label: 'Спорт/Здоровье', category: 'health' }
  ];

  const priorities = [
    { value: 'low', label: 'Низкий', color: '#9ca3af' },
    { value: 'medium', label: 'Средний', color: '#f59e0b' },
    { value: 'high', label: 'Высокий', color: '#22c55e' }
  ];

  const [filterColor, setFilterColor] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, subject: null });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const subs = await subjectsAPI.getAll();
      setSubjects(subs);
      const tasksMap = {};
      for (const s of subs) {
        const tasks = await tasksAPI.getBySubject(s.id);
        tasksMap[s.id] = tasks;
      }
      setTasksBySubject(tasksMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const created = await subjectsAPI.create({
        name: newSubjectName,
        color: newSubjectColor,
        category: colorGroups.find(g => g.color === newSubjectColor)?.category || null
      });
      setSubjects([created, ...subjects]);
      setTasksBySubject({ ...tasksBySubject, [created.id]: [] });
      setNewSubjectName('');
      setShowAddSubject(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSubjectClick = (subject) => {
    setDeleteModal({ open: true, subject });
  };

  const handleDeleteSubjectConfirm = async () => {
    if (!deleteModal.subject) return;
    try {
      await subjectsAPI.delete(deleteModal.subject.id);
      setSubjects(subjects.filter(s => s.id !== deleteModal.subject.id));
      const { [deleteModal.subject.id]: _, ...rest } = tasksBySubject;
      setTasksBySubject(rest);
      setDeleteModal({ open: false, subject: null });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleTask = async (subjectId, taskId) => {
    const tasks = tasksBySubject[subjectId] || [];
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      await tasksAPI.update(taskId, { is_completed: !task.is_completed });
      setTasksBySubject({
        ...tasksBySubject,
        [subjectId]: tasks.map(t => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTask = async (subjectId) => {
    if (!newTaskTitle.trim()) return;
    try {
      const created = await tasksAPI.create({
        subject_id: subjectId,
        title: newTaskTitle,
        priority: newTaskPriority
      });
      setTasksBySubject({
        ...tasksBySubject,
        [subjectId]: [...(tasksBySubject[subjectId] || []), created]
      });
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setEditingTask(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredSubjects = subjects.filter(s => filterColor === 'all' || s.color === filterColor);

  return (
    <div className={`subjects-page ${isLoaded ? 'loaded' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <img src="/logo-studly.png" alt="Studly" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
            <Home size={20} /><span>Главная</span>
          </button>
          <button className={`nav-item ${isActive('/subjects') ? 'active' : ''}`} onClick={() => navigate('/subjects')}>
            <BookOpen size={20} /><span>Предметы</span>
          </button>
          <button className={`nav-item ${isActive('/sessions') ? 'active' : ''}`} onClick={() => navigate('/sessions')}>
            <Calendar size={20} /><span>Сессии</span>
          </button>
          <button className={`nav-item ${isActive('/statistics') ? 'active' : ''}`} onClick={() => navigate('/statistics')}>
            <TrendingUp size={20} /><span>Статистика</span>
          </button>
          <button className={`nav-item ${isActive('/ai-planner') ? 'active' : ''}`} onClick={() => navigate('/ai-planner')}>
            <Sparkles size={20} /><span>AI Планировщик</span>
          </button>
          <button className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
            <User size={20} /><span>Профиль</span>
          </button>
        </nav>
      </aside>

      <main className="subjects-main">
        <header className="subjects-header">
          <div>
            <h1 className="page-title">Предметы и задачи</h1>
            <p className="page-subtitle">Управляй своими предметами и отслеживай прогресс учебы</p>
          </div>
          <div className="header-actions">
            <button className="btn-add-subject" onClick={() => navigate('/sessions')}>
              <Play size={18} /><span>Начать сессию</span>
            </button>
            <button className="btn-add-subject" onClick={() => setShowAddSubject(!showAddSubject)}>
              <Plus size={18} /><span>Добавить предмет</span>
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="loading-banner">Загрузка...</div>}

        {showAddSubject && (
          <div className="add-subject-form">
            <input
              type="text"
              placeholder="Название предмета"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="input-subject-name"
            />
            <div className="color-picker-section">
              <label className="color-picker-label">Категория предмета:</label>
              <div className="color-picker">
                {colorGroups.map(group => {
                  const isSelected = newSubjectColor === group.color;
                  return (
                    <div key={group.color} className={`color-group-item ${isSelected ? 'selected' : ''}`}>
                      <button
                        className={`color-option ${isSelected ? 'selected' : ''}`}
                        style={{ background: group.color, borderColor: isSelected ? group.color : 'transparent' }}
                        onClick={() => setNewSubjectColor(group.color)}
                        title={group.label}
                      />
                      <span className="color-group-label">{group.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowAddSubject(false)}>Отмена</button>
              <button className="btn-save" onClick={handleAddSubject}>Сохранить</button>
            </div>
          </div>
        )}

        <div className="filter-section">
          <div className="filter-label">Фильтр по категориям:</div>
          <div className="filter-buttons">
            <button className={`filter-btn ${filterColor === 'all' ? 'active' : ''}`} onClick={() => setFilterColor('all')}>Все</button>
            {colorGroups.map(group => (
              <button
                key={group.color}
                className={`filter-btn ${filterColor === group.color ? 'active' : ''}`}
                style={{ borderColor: group.color, color: filterColor === group.color ? group.color : '#6b7280', background: filterColor === group.color ? group.color + '15' : 'transparent' }}
                onClick={() => setFilterColor(group.color)}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        <div className="subjects-grid">
          {filteredSubjects.map(subject => {
            const tasks = tasksBySubject[subject.id] || [];
            const timeStudied = subject.time_studied_minutes || 0;
            const completed = tasks.filter(t => t.is_completed).length;
            return (
              <div key={subject.id} className="subject-card">
                <div className="subject-header" style={{ borderLeftColor: subject.color }}>
                  <div className="subject-title-wrapper">
                    <h2 className="subject-title">{subject.name}</h2>
                    <button className="btn-delete-subject" onClick={() => handleDeleteSubjectClick(subject)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="subject-stats">
                    <div className="subject-stat-item">
                      <Clock size={14} />
                      <span>{Math.floor(timeStudied / 60)}ч {timeStudied % 60}мин</span>
                    </div>
                    <div className="subject-stat-item">
                      <CheckCircle2 size={14} />
                      <span>{completed}/{tasks.length}</span>
                    </div>
                  </div>
                </div>

                <div className="subject-tasks">
                  {tasks.length > 0 ? (
                    tasks.map(task => {
                      const priority = priorities.find(p => p.value === (task.priority || 'medium'));
                      return (
                        <div key={task.id} className="task-item">
                          <button className="task-checkbox" onClick={() => handleToggleTask(subject.id, task.id)}>
                            {task.is_completed ? <CheckCircle2 size={20} style={{ color: subject.color }} /> : <Circle size={20} style={{ color: '#ddd' }} />}
                          </button>
                          <span className={`task-title ${task.is_completed ? 'completed' : ''}`}>{task.title}</span>
                          {task.priority && (
                            <span className="task-priority-badge" style={{ background: priority.color + '20', color: priority.color }}>
                              {priority.label}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-tasks-message"><p>Нет задач. Добавь первую задачу для этого предмета!</p></div>
                  )}

                  {editingTask === subject.id ? (
                    <div className="add-task-form">
                      <input
                        type="text"
                        placeholder="Название задачи"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="input-task-name"
                        autoFocus
                      />
                      <div className="priority-selector">
                        <label className="priority-label">Приоритет:</label>
                        <div className="priority-options">
                          {priorities.map(priority => (
                            <button
                              key={priority.value}
                              className={`priority-option ${newTaskPriority === priority.value ? 'selected' : ''}`}
                              style={{ borderColor: priority.color, background: newTaskPriority === priority.value ? priority.color + '20' : 'transparent', color: newTaskPriority === priority.value ? priority.color : '#6b7280' }}
                              onClick={() => setNewTaskPriority(priority.value)}
                            >
                              {priority.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="task-actions">
                        <button className="btn-cancel-small" onClick={() => { setEditingTask(null); setNewTaskTitle(''); setNewTaskPriority('medium'); }}>Отмена</button>
                        <button className="btn-save-small" onClick={() => handleAddTask(subject.id)} style={{ background: subject.color }}>Добавить</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-add-task" onClick={() => setEditingTask(subject.id)} style={{ color: subject.color }}>
                      <Plus size={16} /> Добавить задачу
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Удалить предмет"
        message={deleteModal.subject ? `Удалить предмет "${deleteModal.subject.name}"? Все задачи тоже будут удалены.` : ''}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteSubjectConfirm}
        onCancel={() => setDeleteModal({ open: false, subject: null })}
        variant="danger"
      />
    </div>
  );
};

export default SubjectsPage;
