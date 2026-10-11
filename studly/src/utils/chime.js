// сигнал в конце интервала, без аудиофайлов
// включается в профиле (localStorage 'studly-sound')

export const isSoundEnabled = () => {
  try { return localStorage.getItem('studly-sound') !== 'off'; } catch { return true; }
};

export const setSoundEnabled = (on) => {
  try { localStorage.setItem('studly-sound', on ? 'on' : 'off'); } catch { /* ignore */ }
};

let ctx = null;

export const playChime = () => {
  if (!isSoundEnabled()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
  } catch {
    /* нет звука — ну и ладно */
  }
};
