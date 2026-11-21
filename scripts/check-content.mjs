// Validates course content in the same Python runtime the browser uses (Pyodide).
//  - runs every ```python run cell of every lesson, in order, in one namespace per lesson
//  - runs every exercise: the solution must pass all tests, the starter must fail at least one
//  - runs every quiz code snippet and prints its output so answers can be eyeballed (--quiz)
// Usage: node scripts/check-content.mjs [--quiz] [filter]
import { loadPyodide } from 'pyodide';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const showQuiz = args.includes('--quiz');
const showOut = args.includes('--show');
const filter = args.find((a) => !a.startsWith('--')) ?? '';

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// Reuse the exact harness shipped to browsers.
const workerSrc = readFileSync(join(ROOT, 'public/py-worker.js'), 'utf8');
const harness = workerSrc.match(/const HARNESS = String\.raw`([\s\S]*?)`;/)[1];

const py = await loadPyodide();
let buffer = '';
const dec = new TextDecoder();
py.setStdout({ write: (b) => { buffer += dec.decode(b); return b.length; } });
py.setStderr({ write: (b) => { buffer += dec.decode(b); return b.length; } });
py.runPython(harness);
const runCell = py.globals.get('run_cell');
const runTests = py.globals.get('run_tests');
const reset = py.globals.get('reset');

// Data files declared in frontmatter/YAML live in public/data/<part>/<section>/<path>.
import { existsSync } from 'node:fs';
const loadFiles = (sectionId, files = []) => {
  for (const rel of files) {
    const src = join(ROOT, 'public/data', sectionId, rel);
    if (!existsSync(src)) { fail(`missing data file public/data/${sectionId}/${rel}`); continue; }
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
    if (dir) py.FS.mkdirTree(dir);
    py.FS.writeFile(rel, readFileSync(src));
  }
};

let failures = 0;
const fail = (msg) => { failures++; console.log(`  ✗ ${msg}`); };

// ---------- Lessons ----------
const lessonDir = join(ROOT, 'src/content/lessons');
for (const file of walk(lessonDir).filter((f) => f.endsWith('.md') && f.includes(filter)).sort()) {
  const md = readFileSync(file, 'utf8');
  // Mirror the browser: `fresh` cells run in their own namespace, reset before each run.
  const cells = [...md.matchAll(/^```python run([^\n]*)\n([\s\S]*?)^```/gm)]
    .map((m) => ({ code: m[2], fresh: /\bfresh\b/.test(m[1]) }));
  const ns = relative(lessonDir, file);
  console.log(`${ns}: ${cells.length} cells`);
  const front = md.match(/^---\n([\s\S]*?)\n---/);
  loadFiles(ns.split('/').slice(0, 2).join('/'), front ? YAML.parse(front[1]).files : []);
  if (front && YAML.parse(front[1]).packages) await py.loadPackage(YAML.parse(front[1]).packages, { messageCallback: () => {} });
  cells.forEach(({ code, fresh }, i) => {
    buffer = '';
    if (fresh) reset(`${ns}#fresh`);
    const ok = runCell(code, fresh ? `${ns}#fresh` : ns);
    if (showOut) console.log(`  [${i + 1}] ${buffer.trim().split('\n').slice(0, 12).join('\n      ')}`);
    if (!ok) fail(`cell ${i + 1} raised:\n${buffer.replace(/^/gm, '      ')}`);
  });
  reset(ns);
  reset(`${ns}#fresh`);
}

// ---------- Practice ----------
const practiceDir = join(ROOT, 'src/content/practice');
for (const file of walk(practiceDir).filter((f) => f.endsWith('.yaml') && f.includes(filter)).sort()) {
  const data = YAML.parse(readFileSync(file, 'utf8'));
  loadFiles(relative(practiceDir, file).replace(/\.yaml$/, ''), data.files);
  if (data.packages) await py.loadPackage(data.packages, { messageCallback: () => {} });
  console.log(`${relative(practiceDir, file)}: ${data.quiz.length} questions, ${(data.exercises ?? []).length} exercises`);
  // Mirror the schema in src/content.config.ts so YAML mistakes fail here, not at build time.
  const isStr = (v) => typeof v === 'string';
  data.quiz.forEach((q, i) => {
    if (!isStr(q.q) || !isStr(q.explain) || (q.code !== undefined && !isStr(q.code))) fail(`quiz ${i + 1}: q/explain/code must be strings`);
    if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(isStr)) fail(`quiz ${i + 1}: options must be 2+ strings`);
    if (!Number.isInteger(q.answer)) fail(`quiz ${i + 1}: answer must be an integer`);
    if (q.answer >= q.options.length) fail(`quiz ${i + 1}: answer index out of range`);
    if (showQuiz && q.code) {
      buffer = '';
      runCell(q.code, `quiz-${i}`);
      reset(`quiz-${i}`);
      console.log(`  quiz ${i + 1} → ${buffer.trim()}   [answer: ${q.options[q.answer]}]`);
    }
  });
  for (const ex of data.exercises ?? []) {
    for (const k of ['id', 'title', 'prompt', 'starter', 'tests', 'solution']) if (!isStr(ex[k])) fail(`exercise ${ex.id}: ${k} must be a string`);
    if (!(ex.hints ?? []).every(isStr)) fail(`exercise ${ex.id}: every hint must be a string (quote hints containing ': ')`);
    buffer = '';
    const sol = JSON.parse(runTests(ex.solution, ex.tests));
    if (!sol.loaded || sol.results.length === 0 || !sol.results.every((r) => r.ok)) {
      fail(`exercise ${ex.id}: solution fails\n      ${JSON.stringify(sol.results)}\n      ${buffer}`);
    } else console.log(`  ✓ ${ex.id}: solution passes ${sol.results.length} tests`);
    const start = JSON.parse(runTests(ex.starter, ex.tests));
    if (start.loaded && start.results.every((r) => r.ok)) fail(`exercise ${ex.id}: starter already passes every test`);
  }
}

console.log(failures ? `\n${failures} problem(s) found` : '\nAll content checks passed');
process.exit(failures ? 1 : 0);
