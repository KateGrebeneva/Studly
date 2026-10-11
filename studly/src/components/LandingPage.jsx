import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Timer, Sparkles, BarChart3, BookOpen, CheckCircle2, Circle, Play,
  Flame, Trophy, Users, KeyRound, CalendarClock, Brain, Menu, X, Target, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Logo, Mascot, Spots } from './ui';
import './LandingPage.css';

const SPOT_MOMENTS = [
  { pose: 'wave', title: 'Встречает', text: 'Каждый день на главной — с планом и одной подсказкой.' },
  { pose: 'sit', title: 'Ждёт рядом', text: 'Тихо сидит, пока идёт фокус-сессия, и не отвлекает.' },
  { pose: 'lying', title: 'Отдыхает с тобой', text: 'На перерыве напомнит встать и потянуться.' },
  { pose: 'jump', title: 'Радуется', text: 'Прыгает от счастья, когда сессия завершена.' },
  { pose: 'thumbs', title: 'Хвалит', text: 'Отмечает серии, цели и новые достижения.' },
  { pose: 'shy', title: 'Думает', text: 'Собирает для тебя AI-план и вопросы для закрепления.' },
  { pose: 'playful', title: 'Зовёт учиться', text: 'Делает из скучного «надо» игру с понятными шагами.' },
  { pose: 'surprised', title: 'Удивляется', text: 'Если ты свернул не туда — поможет вернуться.' },
  { pose: 'grumpy', title: 'Ворчит', text: 'Чуть-чуть, когда сервер не отвечает. Не со зла.' },
];

const NAV = [
  { id: 'spot', label: 'Спот' },
  { id: 'product', label: 'Продукт' },
  { id: 'day', label: 'Как это работает' },
  { id: 'ai', label: 'AI-помощник' },
  { id: 'parents', label: 'Родителям' },
];

/* маленький таймер для витрины, просто тикает */
const DemoTimer = () => {
  const [sec, setSec] = useState(18 * 60 + 42);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq?.matches) return undefined;
    const t = setInterval(() => setSec((s) => (s <= 1 ? 25 * 60 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const pct = 1 - sec / (25 * 60);
  const C = 2 * Math.PI * 18;
  return (
    <div className="ld-timer-chip">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 22 22)" />
      </svg>
      <div>
        <span className="ld-timer-time t-num">{mm}:{ss}</span>
        <span className="ld-timer-label">Фокус · Производные</span>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef(null);
  const stripRef = useRef(null);
  const scrollStrip = (dir) => {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 600), behavior: 'smooth' });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal') || [];
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isAuthed = (() => { try { return !!localStorage.getItem('studly_token'); } catch { return false; } })();
  const appHome = (() => {
    try {
      const role = JSON.parse(localStorage.getItem('studly_user') || '{}').role;
      return role === 'parent' ? '/parent' : role === 'admin' ? '/admin' : '/dashboard';
    } catch { return '/dashboard'; }
  })();
  const start = () => navigate(isAuthed ? appHome : '/register');

  return (
    <div className="ld" ref={rootRef}>
      {/* меню */}
      <header className={`ld-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="ld-wrap ld-nav-inner">
          <button type="button" className="ld-logo-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Studly — наверх">
            <Logo size={32} />
          </button>
          <nav className="ld-links" aria-label="Разделы">
            {NAV.map((n) => <button key={n.id} type="button" onClick={() => go(n.id)}>{n.label}</button>)}
          </nav>
          <div className="ld-nav-actions">
            {isAuthed ? (
              <button type="button" className="btn btn-primary" onClick={() => navigate(appHome)}>Открыть Studly</button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost ld-login" onClick={() => navigate('/login')}>Войти</button>
                <button type="button" className="btn btn-primary" onClick={() => navigate('/register')}>Создать аккаунт</button>
              </>
            )}
            <button type="button" className="btn btn-ghost btn-icon ld-burger" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="Меню">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="ld-mobile-menu">
            {NAV.map((n) => <button key={n.id} type="button" onClick={() => go(n.id)}>{n.label}</button>)}
            {!isAuthed && <button type="button" onClick={() => navigate('/login')}>Войти</button>}
          </div>
        )}
      </header>

      <main>
        {/* шапка */}
        <section className="ld-hero ld-wrap">
          <div className="ld-frame">
            <div className="ld-hero-words">
              <h1 className="ld-word ld-word-left">
                <span className="ld-word-small">Своя</span>
                <span className="ld-word-big">УЧЁБА</span>
              </h1>
              <p className="ld-word ld-word-right" aria-hidden="true">
                <span className="ld-word-small">Свой</span>
                <span className="ld-word-big">РИТМ</span>
                <svg className="ld-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l2.6 8.2L23 6.5l-6.2 5.8L23 18l-8.4-1.7L12 24l-2.6-7.7L1 18l6.2-5.7L1 6.5l8.4 1.7z" /></svg>
              </p>
            </div>

            <div className="ld-panel panel-violet">
              <div className="ld-panel-left">
                <p className="ld-eyebrow"><Sparkles size={15} /> Учебный трекер с AI-помощником</p>
                <h2 className="ld-panel-title">Порядок в учёбе — без хаоса и зубрёжки</h2>
                <p className="ld-panel-text">Предметы, задачи, Pomodoro-сессии, статистика и AI-тесты в одном спокойном пространстве.</p>
                <button type="button" className="btn btn-ink btn-lg ld-cta" onClick={start}>
                  {isAuthed ? 'Продолжить учёбу' : 'Начать учиться'}
                  <span className="btn-arrow"><ArrowRight size={16} /></span>
                </button>
                <DemoTimer />
              </div>

              <div className="ld-hero-mascot">
                <svg className="ld-orbit" viewBox="0 0 400 140" aria-hidden="true">
                  <ellipse cx="200" cy="70" rx="196" ry="60" />
                </svg>
                <Mascot variant="full" pose="stand" mood="idle" alt="Спот — далматинец, маскот Studly. Нажми на него!" cycle={['stand', 'wave', 'thumbs', 'jump', 'playful']} />
              </div>

              <div className="ld-panel-right">
                <ul className="ld-feats">
                  <li><Timer size={22} /><span>Pomodoro-сессии</span></li>
                  <li><Brain size={22} /><span>AI-тесты</span></li>
                  <li><BarChart3 size={22} /><span>Прогресс</span></li>
                </ul>
                <div className="ld-next-card">
                  <p className="ld-next-label">Ближайшая сессия</p>
                  <div className="ld-next-body">
                    <span className="badge badge-subject" style={{ '--c': '#5b82c9' }}>Физика</span>
                    <p className="ld-next-goal">Законы Ньютона: решить 10 задач</p>
                    <p className="ld-next-meta"><CalendarClock size={14} /> Сегодня, 17:30 · 4 × 25 мин</p>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm btn-block" onClick={start}><Play size={15} /> Начать</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* знакомство со Спотом */}
        <section id="spot" className="ld-section ld-wrap">
          <div className="ld-spot-head reveal">
            <div>
              <h2 className="ld-h2">Знакомься — Спот</h2>
              <p className="ld-lead">Далматинец, который учится вместе с тобой. У него есть настроение на каждый момент учебного дня — листай.</p>
            </div>
            <div className="ld-strip-nav">
              <button type="button" className="btn btn-icon" onClick={() => scrollStrip(-1)} aria-label="Назад"><ChevronLeft size={20} /></button>
              <button type="button" className="btn btn-icon" onClick={() => scrollStrip(1)} aria-label="Вперёд"><ChevronRight size={20} /></button>
            </div>
          </div>
          <div className="ld-strip reveal" ref={stripRef} tabIndex={0} aria-label="Настроения Спота">
            {SPOT_MOMENTS.map((m) => (
              <article key={m.pose} className={`ld-moment pose-card--${m.pose}`}>
                <div className="ld-moment-art">
                  <Mascot variant="full" pose={m.pose} mood="idle" decorative />
                </div>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* витрина */}
        <section id="product" className="ld-section ld-wrap">
          <div className="ld-section-head reveal">
            <h2 className="ld-h2">Весь учебный день — на одном экране</h2>
            <p className="ld-lead">Открываешь Studly и сразу видишь: что запланировано, сколько уже сделано и какой предмет давно не открывался.</p>
          </div>

          <div className="ld-showcase reveal">
            <div className="ld-browser">
              <div className="ld-browser-bar"><i /><i /><i /><span>studly / главная</span></div>
              <div className="ld-mock">
                <aside className="ld-mock-side">
                  <Logo size={22} />
                  {['Главная', 'Предметы', 'Сессии', 'Статистика', 'Награды', 'AI'].map((t, i) => (
                    <span key={t} className={i === 0 ? 'is-on' : ''}>{t}</span>
                  ))}
                </aside>
                <div className="ld-mock-main">
                  <div className="ld-mock-hero">
                    <div>
                      <small>четверг, 9 октября</small>
                      <b>Добрый день, Аня</b>
                      <span>Сегодня — 1 ч 15 мин учёбы и 3 задачи.</span>
                    </div>
                    <Mascot variant="head" mood="idle" decorative />
                  </div>
                  <div className="ld-mock-row">
                    <div className="ld-mock-card ld-mock-plan">
                      <b>Учебный план</b>
                      {[
                        ['17:30', 'Законы Ньютона', '#5b82c9'],
                        ['19:00', 'Эссе по литературе', '#e8566b'],
                        ['Завтра', 'Неправильные глаголы', '#2fb58c'],
                      ].map(([t, g, c]) => (
                        <div key={g} className="ld-mock-line"><i style={{ background: c }} /><small>{t}</small><span>{g}</span></div>
                      ))}
                    </div>
                    <div className="ld-mock-card ld-mock-streak">
                      <b>Серия</b>
                      <strong>6 <small>дней</small></strong>
                      <div className="ld-mock-spots">{[1, 1, 1, 0, 1, 1, 1].map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</div>
                    </div>
                  </div>
                  <div className="ld-mock-card ld-mock-bars">
                    <b>Неделя в минутах</b>
                    <div>{[40, 65, 30, 0, 90, 55, 75].map((h, i) => <span key={i} style={{ height: `${Math.max(4, h)}%` }} className={i === 6 ? 'is-today' : ''} />)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ld-callout ld-callout-1"><Flame size={18} /> Серия дней мотивирует не пропускать</div>
            <div className="ld-callout ld-callout-2"><Target size={18} /> Ближайшая сессия — в один клик</div>
          </div>

          <div className="ld-pillars">
            {[
              { icon: BookOpen, t: 'Предметы и задачи', d: 'Раздели учёбу по предметам и категориям, отмечай задачи с приоритетом.' },
              { icon: Timer, t: 'Pomodoro-сессии', d: 'Готовые ритмы 25/5, 45/15 или свои интервалы. Таймер сам считает время.' },
              { icon: BarChart3, t: 'Честная статистика', d: 'Минуты по дням и предметам, календарь занятий и самый продуктивный день.' },
              { icon: Trophy, t: 'Цели и награды', d: 'Цели на день, неделю и месяц, достижения за регулярность.' },
            ].map(({ icon: Icon, t, d }, i) => (
              <article key={t} className={`ld-pillar reveal`} style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="ld-pillar-icon"><Icon size={22} /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* день со Studly */}
        <section id="day" className="ld-section ld-wrap">
          <div className="ld-section-head reveal">
            <h2 className="ld-h2">Как проходит день со Studly</h2>
            <p className="ld-lead">Четыре шага, которые превращают «надо бы позаниматься» в понятный план.</p>
          </div>

          <ol className="ld-steps">
            <li className="ld-step reveal">
              <span className="ld-step-n">1</span>
              <h3>Собери предметы и задачи</h3>
              <p>Добавь предметы, раздели их по цветам и запиши, что нужно сделать.</p>
              <div className="ld-vis ld-vis-tasks">
                <div><CheckCircle2 size={18} className="ok" /><s>Конспект §12</s><span className="badge badge-mint">Готово</span></div>
                <div><Circle size={18} /><span>Задачи 4–9</span><span className="badge badge-sun">Средний</span></div>
                <div><Circle size={18} /><span>Подготовка к тесту</span><span className="badge badge-rose">Высокий</span></div>
              </div>
            </li>
            <li className="ld-step reveal">
              <span className="ld-step-n">2</span>
              <h3>Запусти сессию</h3>
              <p>Pomodoro-таймер ведёт по интервалам работы и отдыха и сам сохраняет время.</p>
              <div className="ld-vis ld-vis-timer">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="50" className="trk" />
                  <circle cx="60" cy="60" r="50" className="val" />
                </svg>
                <div><b className="t-num">25:00</b><small>Интервал 2 из 4</small></div>
              </div>
            </li>
            <li className="ld-step reveal">
              <span className="ld-step-n">3</span>
              <h3>Закрепи тему</h3>
              <p>После сессии AI составит вопросы по тому, что ты только что изучал.</p>
              <div className="ld-vis ld-vis-chat">
                <p className="me">Тема: производные</p>
                <p className="ai">1. Чему равна производная x²? <br />2. Что показывает производная в точке?</p>
              </div>
            </li>
            <li className="ld-step reveal">
              <span className="ld-step-n">4</span>
              <h3>Смотри, как растёшь</h3>
              <p>Статистика показывает минуты, серии и любимые предметы — без лишних цифр.</p>
              <div className="ld-vis ld-vis-bars">{[30, 55, 40, 70, 85].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
            </li>
          </ol>
        </section>

        {/* ai */}
        <section id="ai" className="ld-section ld-wrap">
          <div className="ld-ai reveal">
            <Spots set="b" opacity={0.07} />
            <div className="ld-ai-text">
              <p className="ld-eyebrow ld-eyebrow-light"><Sparkles size={15} /> AI внутри</p>
              <h2 className="ld-h2">Помощник, который знает твой ритм</h2>
              <ul className="ld-ai-list">
                <li>
                  <span><CalendarClock size={20} /></span>
                  <div><b>AI-планировщик</b><p>Анализирует, когда ты занимаешься лучше всего, и предлагает расписание. Подходящее — добавляется в сессии одной кнопкой.</p></div>
                </li>
                <li>
                  <span><Brain size={20} /></span>
                  <div><b>AI-тесты для закрепления</b><p>Вопросы по теме сессии сразу после таймера — чтобы знания не выветрились к вечеру.</p></div>
                </li>
                <li>
                  <span><Clock size={20} /></span>
                  <div><b>Зоны продуктивности</b><p>Видно, в какие часы фокус держится дольше, а когда лучше сделать перерыв.</p></div>
                </li>
              </ul>
              <button type="button" className="btn btn-primary btn-lg" onClick={start}>Попробовать AI-план <span className="btn-arrow"><ArrowRight size={16} /></span></button>
            </div>
            <div className="ld-ai-visual">
              <div className="ld-ai-card">
                <div className="ld-ai-card-head"><Sparkles size={16} /> План на завтра</div>
                {[
                  ['16:00', 'Алгебра', '50 мин', 'high'],
                  ['17:10', 'Английский', '25 мин', 'mid'],
                  ['18:00', 'История', '25 мин', 'mid'],
                ].map(([t, s, d, p]) => (
                  <div key={s} className="ld-ai-row"><b className="t-num">{t}</b><span>{s}</span><small>{d}</small><i className={p} /></div>
                ))}
                <button type="button" className="btn btn-soft btn-sm btn-block" onClick={start}>Применить</button>
              </div>
              <Mascot variant="bust" pose="shy" mood="think" className="ld-ai-mascot" decorative />
            </div>
          </div>
        </section>

        {/* мотивация */}
        <section className="ld-section ld-wrap">
          <div className="ld-moti">
            <div className="ld-moti-art reveal">
              <Mascot variant="full" pose="jump" mood="cheer" decorative />
              <div className="ld-badge-float b1"><Trophy size={18} /> Первая сессия</div>
              <div className="ld-badge-float b2"><Flame size={18} /> 7 дней подряд</div>
              <div className="ld-badge-float b3"><Clock size={18} /> 10 часов фокуса</div>
            </div>
            <div className="ld-moti-text reveal">
              <h2 className="ld-h2">Хочется возвращаться завтра</h2>
              <p className="ld-lead">Серии без пропусков, достижения за регулярность и Спот, который радуется каждой завершённой сессии. Мотивация без давления и бесконечных уведомлений.</p>
              <div className="ld-moti-spots" aria-hidden="true">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => (
                  <span key={d}><i className={i < 5 ? 'on' : ''} /><small>{d}</small></span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* родителям */}
        <section id="parents" className="ld-section ld-wrap">
          <div className="ld-parents">
            <div className="ld-parents-text reveal">
              <h2 className="ld-h2">Родителям и учителям</h2>
              <p className="ld-lead">Ученик создаёт код в профиле, взрослый вводит его в своём кабинете — и видит прогресс без лишнего контроля.</p>
              <ul className="ld-parent-list">
                <li><KeyRound size={20} /><span>Привязка по одноразовому коду из профиля ученика</span></li>
                <li><BarChart3 size={20} /><span>Время, задачи и серия за сегодня и неделю</span></li>
                <li><CalendarClock size={20} /><span>Можно назначить сессию прямо из кабинета</span></li>
              </ul>
              <button type="button" className="btn btn-ink btn-lg" onClick={() => navigate(isAuthed ? appHome : '/register')}>
                <Users size={18} /> {isAuthed ? 'Открыть кабинет' : 'Создать кабинет родителя'}
              </button>
            </div>
            <div className="ld-parent-card reveal">
              <div className="ld-pc-head">
                <span className="ld-pc-avatar">М</span>
                <div><b>Маша</b><small>8 класс</small></div>
                <span className="badge badge-mint">сегодня занималась</span>
              </div>
              <div className="ld-pc-stats">
                <div><b className="t-num">1 ч 40 мин</b><small>сегодня</small></div>
                <div><b className="t-num">5</b><small>задач</small></div>
                <div><b className="t-num">9 дн.</b><small>серия</small></div>
              </div>
              <div className="ld-pc-bars">{[35, 60, 45, 80, 50, 20, 70].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
            </div>
          </div>
        </section>

        {/* финал */}
        <section className="ld-section ld-wrap">
          <div className="ld-final panel-violet reveal">
            <Spots set="a" opacity={0.1} />
            <div className="ld-final-text">
              <h2 className="ld-final-title">Первая сессия займёт 25 минут</h2>
              <p>Создай аккаунт, добавь один предмет и запусти таймер. Остальное Studly подскажет.</p>
              <div className="ld-final-actions">
                <button type="button" className="btn btn-ink btn-lg" onClick={start}>
                  {isAuthed ? 'Перейти к учёбе' : 'Создать аккаунт'} <span className="btn-arrow"><ArrowRight size={16} /></span>
                </button>
                {!isAuthed && <button type="button" className="btn btn-on-panel btn-lg" onClick={() => navigate('/login')}>У меня есть аккаунт</button>}
              </div>
            </div>
            <Mascot variant="bust" pose="thumbs" mood="cheer" className="ld-final-mascot" decorative />
          </div>
        </section>
      </main>

      <footer className="ld-footer">
        <div className="ld-wrap ld-footer-inner">
          <div className="ld-footer-brand">
            <Logo size={30} />
            <p>Учебный трекер для школьников, студентов и взрослых, которые учатся сами.</p>
          </div>
          <nav className="ld-footer-nav" aria-label="Разделы">
            {NAV.map((n) => <button key={n.id} type="button" onClick={() => go(n.id)}>{n.label}</button>)}
          </nav>
          <nav className="ld-footer-nav" aria-label="Аккаунт">
            <button type="button" onClick={() => navigate('/login')}>Войти</button>
            <button type="button" onClick={() => navigate('/register')}>Регистрация</button>
          </nav>
        </div>
        <div className="ld-wrap ld-footer-bottom">© {new Date().getFullYear()} Studly</div>
      </footer>
    </div>
  );
};

export default LandingPage;
