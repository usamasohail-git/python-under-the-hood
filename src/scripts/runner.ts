// Main-thread client for public/py-worker.js. One shared worker per page.

export type Stream = 'stdout' | 'stderr';
export interface TestResult { name: string; ok: boolean; msg: string }
export interface TestReport { loaded: boolean; results: TestResult[] }

type Pending = {
  onOut: (stream: Stream, text: string) => void;
  resolve: (msg: any) => void;
};

const TIMEOUT_MS = 15000;

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
const statusListeners = new Set<(s: RunnerStatus) => void>();

export type RunnerStatus = 'idle' | 'loading' | 'ready' | 'restarted';
let status: RunnerStatus = 'idle';

function setStatus(s: RunnerStatus) {
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

export function onStatus(fn: (s: RunnerStatus) => void) {
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

function workerUrl() {
  const base = document.documentElement.dataset.base || '/';
  return `${base.replace(/\/$/, '')}/py-worker.js`;
}

/** Data files the page needs (declared in lesson/practice frontmatter as data-files on <body>). */
function pageSetup(): { files: { url: string; path: string }[]; packages: string[] } {
  const raw = document.body.dataset.files;
  if (!raw) return { files: [], packages: [] };
  const base = (document.documentElement.dataset.base || '/').replace(/\/$/, '');
  const { section, files, packages = [] } = JSON.parse(raw) as { section: string; files: string[]; packages?: string[] };
  return { files: files.map((path) => ({ url: `${base}/data/${section}/${path}`, path })), packages };
}

/** Start downloading Python early (e.g. when the reader reaches the first code cell). */
export function warmUp(): Promise<void> {
  if (readyPromise) return readyPromise;
  setStatus('loading');
  worker = new Worker(workerUrl());
  const setup = pageSetup();
  readyPromise = new Promise((resolve, reject) => {
    worker!.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        if (!setup.files.length && !setup.packages.length) { setStatus('ready'); resolve(); return; }
        // Load the page's packages and data files before any cell runs.
        const id = nextId++;
        pending.set(id, { onOut: () => {}, resolve: () => { setStatus('ready'); resolve(); } });
        worker!.postMessage({ id, type: 'files', files: setup.files, packages: setup.packages });
        return;
      }
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.type === 'out') p.onOut(msg.stream, msg.text);
      else if (msg.type === 'done') { pending.delete(msg.id); p.resolve(msg); }
    };
    worker!.onerror = (e) => reject(e);
  });
  return readyPromise;
}

function restart() {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  for (const [, p] of pending) p.resolve({ type: 'done', ok: false, timedOut: true });
  pending.clear();
  setStatus('restarted');
  resetListeners.forEach((fn) => fn());
}

// Cells subscribe so they can show "not run" after a restart wipes all state.
const resetListeners = new Set<() => void>();
export function onRestart(fn: () => void) { resetListeners.add(fn); }

function request(payload: object, onOut: Pending['onOut'] = () => {}): Promise<any> {
  return warmUp().then(() => new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      onOut('stderr', `\nStopped: this code ran for more than ${TIMEOUT_MS / 1000}s (infinite loop?). Python was restarted, so earlier cells will run again.`);
      restart();
    }, TIMEOUT_MS);
    pending.set(id, {
      onOut,
      resolve: (m) => {
        clearTimeout(timer);
        resolve(m);
        if (m.fatal) restart();   // the interpreter crashed: start a fresh one
      },
    });
    worker!.postMessage({ id, ...payload });
  }));
}

export async function runCell(code: string, ns: string, onOut: Pending['onOut']): Promise<boolean> {
  const msg = await request({ type: 'run', code, ns }, onOut);
  return !!msg.ok;
}

export async function resetNamespace(ns: string) {
  if (!worker) return;
  await request({ type: 'reset', ns });
}

export async function runTests(code: string, tests: string, onOut: Pending['onOut']): Promise<TestReport | null> {
  const msg = await request({ type: 'test', code, tests }, onOut);
  return msg.result ?? null;
}
