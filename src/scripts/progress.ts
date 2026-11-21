// Per-visitor progress kept in localStorage. Every access is guarded: storage can be
// unavailable (private windows, blocked site data) and the site must still work.

const PREFIX = 'pdd:';

function read(key: string): string | null {
  try { return localStorage.getItem(PREFIX + key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch { /* ignore */ }
}

export const isDone = (lectureId: string) => read(`done:${lectureId}`) === '1';
export const setDone = (lectureId: string, done: boolean) => write(`done:${lectureId}`, done ? '1' : null);

export const quizBest = (sectionId: string): number | null => {
  const v = read(`quiz:${sectionId}`);
  return v === null ? null : Number(v);
};
export const recordQuiz = (sectionId: string, pct: number) => {
  const best = quizBest(sectionId);
  if (best === null || pct > best) write(`quiz:${sectionId}`, String(pct));
};

export const exercisePassed = (sectionId: string, exId: string) => read(`ex:${sectionId}:${exId}`) === '1';
export const setExercisePassed = (sectionId: string, exId: string) => write(`ex:${sectionId}:${exId}`, '1');

/** Decorate any element with data-progress-lecture="<id>" (adds .is-done)
 *  and data-progress-of="<id1> <id2> ..." (fills a bar / count). */
export function paintProgress(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-progress-lecture]').forEach((el) => {
    el.classList.toggle('is-done', isDone(el.dataset.progressLecture!));
  });
  root.querySelectorAll<HTMLElement>('[data-progress-of]').forEach((el) => {
    const ids = el.dataset.progressOf!.split(' ').filter(Boolean);
    const done = ids.filter(isDone).length;
    const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
    el.style.setProperty('--pct', `${pct}%`);
    const label = el.querySelector('[data-progress-label]');
    if (label) label.textContent = done ? `${done} / ${ids.length} done` : '';
  });
  root.querySelectorAll<HTMLElement>('[data-quiz-best]').forEach((el) => {
    const best = quizBest(el.dataset.quizBest!);
    el.textContent = best === null ? '' : `Best quiz score: ${best}%`;
  });
}

// Lecture page "mark complete" toggle.
const toggle = document.querySelector<HTMLButtonElement>('[data-mark-done]');
if (toggle) {
  const id = toggle.dataset.markDone!;
  const render = () => {
    const done = isDone(id);
    toggle.setAttribute('aria-pressed', String(done));
    toggle.textContent = done ? '✓ Completed' : 'Mark as complete';
  };
  toggle.addEventListener('click', () => { setDone(id, !isDone(id)); render(); paintProgress(); });
  render();
}

paintProgress();
