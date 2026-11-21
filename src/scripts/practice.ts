// Quiz + auto-graded exercises on a section's practice page.
import { createEditor } from './editor';
import { runTests, warmUp } from './runner';
import { recordQuiz, exercisePassed, setExercisePassed, paintProgress } from './progress';

const page = document.querySelector<HTMLElement>('[data-practice]');
const sectionId = page?.dataset.practice ?? '';

// ---------- Quiz ----------
const quiz = document.querySelector<HTMLElement>('[data-quiz]');
if (quiz) {
  const questions = [...quiz.querySelectorAll<HTMLElement>('[data-question]')];
  const summary = quiz.querySelector<HTMLElement>('[data-quiz-summary]')!;
  const retry = quiz.querySelector<HTMLButtonElement>('[data-quiz-retry]')!;
  let answered = 0;
  let correct = 0;

  const finish = () => {
    const pct = Math.round((correct / questions.length) * 100);
    recordQuiz(sectionId, pct);
    summary.hidden = false;
    summary.querySelector('[data-quiz-score]')!.textContent =
      `You got ${correct} of ${questions.length} right (${pct}%).`;
    retry.hidden = false;
    paintProgress();
  };

  questions.forEach((q) => {
    const answer = Number(q.dataset.answer);
    const inputs = [...q.querySelectorAll<HTMLInputElement>('input[type=radio]')];
    const feedback = q.querySelector<HTMLElement>('[data-feedback]')!;
    inputs.forEach((input) => input.addEventListener('change', () => {
      if (q.dataset.locked) return;
      q.dataset.locked = '1';
      const chosen = Number(input.value);
      const right = chosen === answer;
      if (right) correct++;
      answered++;
      inputs.forEach((i) => {
        i.disabled = true;
        const label = i.closest('label')!;
        if (Number(i.value) === answer) label.classList.add('is-correct');
        else if (i === input) label.classList.add('is-wrong');
      });
      feedback.hidden = false;
      feedback.querySelector('[data-verdict]')!.textContent = right ? 'Correct.' : 'Not quite.';
      feedback.classList.toggle('is-right', right);
      if (answered === questions.length) finish();
    }));
  });

  retry.addEventListener('click', () => {
    answered = 0; correct = 0;
    questions.forEach((q) => {
      delete q.dataset.locked;
      q.querySelectorAll<HTMLInputElement>('input').forEach((i) => { i.checked = false; i.disabled = false; });
      q.querySelectorAll('label').forEach((l) => l.classList.remove('is-correct', 'is-wrong'));
      (q.querySelector('[data-feedback]') as HTMLElement).hidden = true;
    });
    summary.hidden = true;
    retry.hidden = true;
    questions[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ---------- Exercises ----------
document.querySelectorAll<HTMLElement>('[data-exercise]').forEach((ex) => {
  const id = ex.dataset.exercise!;
  const starter = ex.querySelector<HTMLElement>('[data-starter]')!.textContent!.replace(/\n$/, '');
  const tests = ex.querySelector<HTMLElement>('[data-tests]')!.textContent!;
  const out = ex.querySelector<HTMLElement>('[data-results]')!;
  const checkBtn = ex.querySelector<HTMLButtonElement>('[data-check]')!;
  const badge = ex.querySelector<HTMLElement>('[data-badge]')!;
  const draftKey = `pdd:draft:${sectionId}:${id}`;

  let initial = starter;
  try { initial = localStorage.getItem(draftKey) ?? starter; } catch { /* ignore */ }

  const check = async () => {
    checkBtn.disabled = true;
    out.hidden = false;
    out.innerHTML = '<p class="muted">Running tests…</p>';
    const printed: string[] = [];
    const report = await runTests(view.state.doc.toString(), tests, (_s, t) => printed.push(t));
    checkBtn.disabled = false;
    out.innerHTML = '';
    if (!report || !report.loaded) {
      const p = document.createElement('p');
      p.className = 'test-fail';
      p.textContent = 'Your code raised an error before the tests could run:';
      const pre = document.createElement('pre');
      pre.className = 'cell-out has-error';
      pre.textContent = printed.join('') || 'Unknown error';
      out.append(p, pre);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'test-list';
    for (const r of report.results) {
      const li = document.createElement('li');
      li.className = r.ok ? 'test-pass' : 'test-fail';
      li.textContent = `${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.msg}`}`;
      list.appendChild(li);
    }
    const allOk = report.results.length > 0 && report.results.every((r) => r.ok);
    const head = document.createElement('p');
    head.className = allOk ? 'test-pass' : 'test-fail';
    head.textContent = allOk ? 'All tests passed. Nice work!' : `${report.results.filter((r) => r.ok).length} of ${report.results.length} tests passed.`;
    out.append(head, list);
    if (printed.length) {
      const pre = document.createElement('pre');
      pre.className = 'cell-out';
      pre.textContent = printed.join('');
      out.append(pre);
    }
    if (allOk) { setExercisePassed(sectionId, id); badge.hidden = false; }
  };

  const view = createEditor(ex.querySelector('[data-editor]')!, initial, check);
  // Save drafts as the learner types.
  const save = () => { try { localStorage.setItem(draftKey, view.state.doc.toString()); } catch { /* ignore */ } };
  ex.querySelector('[data-editor]')!.addEventListener('keyup', save);

  checkBtn.addEventListener('click', check);
  ex.querySelector('[data-reset]')!.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    out.hidden = true;
  });
  ex.addEventListener('pointerenter', () => warmUp(), { once: true });
  badge.hidden = !exercisePassed(sectionId, id);
});
