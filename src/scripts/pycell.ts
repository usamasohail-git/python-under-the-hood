// <py-cell>: an editable, runnable Python cell. Cells on a page share one namespace,
// like a notebook. Running a cell first runs any earlier cells that haven't run yet.
import type { EditorView } from '@codemirror/view';
import { createEditor } from './editor';
import { runCell, resetNamespace, warmUp, onStatus, onRestart } from './runner';

const cells: PyCell[] = [];
let queue: Promise<unknown> = Promise.resolve();

function pageNamespace() {
  return document.body.dataset.ns || location.pathname;
}

export class PyCell extends HTMLElement {
  original = '';
  view!: EditorView;
  out!: HTMLPreElement;
  runBtn!: HTMLButtonElement;
  hasRun = false;
  fresh = false;

  connectedCallback() {
    if (this.view) return;
    this.original = (this.querySelector('.py-src')?.textContent ?? '').replace(/\n$/, '');
    this.fresh = this.hasAttribute('data-fresh');
    this.innerHTML = `
      <div class="cell-editor"></div>
      <div class="cell-bar">
        <button class="cell-run" type="button" title="Run (Shift+Enter)"><span aria-hidden="true">▶</span> Run</button>
        <button class="cell-reset" type="button" title="Restore the original code">Reset code</button>
        <span class="cell-status" aria-live="polite"></span>
      </div>
      <pre class="cell-out" hidden></pre>`;
    this.view = createEditor(this.querySelector('.cell-editor')!, this.original, () => this.run());
    this.out = this.querySelector('.cell-out')!;
    this.runBtn = this.querySelector('.cell-run')!;
    this.runBtn.addEventListener('click', () => this.run());
    this.querySelector('.cell-reset')!.addEventListener('click', () => {
      this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: this.original } });
      this.clearOutput();
      this.setStatus('');
    });
    const warm = () => warmUp();
    this.addEventListener('pointerenter', warm, { once: true });
    this.addEventListener('focusin', warm, { once: true });
    cells.push(this);
  }

  get code() { return this.view.state.doc.toString(); }

  setStatus(text: string) { (this.querySelector('.cell-status') as HTMLElement).textContent = text; }

  clearOutput() { this.out.textContent = ''; this.out.hidden = true; this.out.classList.remove('has-error'); }

  write(stream: string, text: string) {
    this.out.hidden = false;
    if (stream === 'stderr') {
      const span = document.createElement('span');
      span.className = 'err';
      span.textContent = text;
      this.out.appendChild(span);
      this.out.classList.add('has-error');
    } else {
      this.out.appendChild(document.createTextNode(text));
    }
  }

  async execute(): Promise<boolean> {
    this.clearOutput();
    this.runBtn.disabled = true;
    this.setStatus('Running…');
    const ns = this.fresh ? `${pageNamespace()}#fresh` : pageNamespace();
    if (this.fresh) await resetNamespace(ns);
    const ok = await runCell(this.code, ns, (s, t) => this.write(s, t));
    this.runBtn.disabled = false;
    this.hasRun = true;
    this.setStatus(ok ? '' : 'Error');
    if (ok && !this.out.textContent) this.setStatus('Done (no output)');
    return ok;
  }

  run() {
    queue = queue.then(async () => {
      const idx = cells.indexOf(this);
      if (!this.fresh) {
        for (const earlier of cells.slice(0, idx)) {
          if (!earlier.hasRun && !earlier.fresh) await earlier.execute();
        }
      }
      await this.execute();
    });
    return queue;
  }
}

export async function restartPage() {
  await resetNamespace(pageNamespace());
  cells.forEach((c) => { c.hasRun = false; c.clearOutput(); c.setStatus(''); });
}

onRestart(() => cells.forEach((c) => { c.hasRun = false; }));

customElements.define('py-cell', PyCell);

// Page-level status pill + restart button (rendered by the lesson layout).
const pill = document.querySelector<HTMLElement>('[data-py-status]');
if (pill) {
  const label: Record<string, string> = {
    idle: 'Python loads when you run a cell',
    loading: 'Loading Python…',
    ready: 'Python ready',
    restarted: 'Python restarted',
  };
  onStatus((s) => { pill.textContent = label[s]; pill.dataset.state = s; });
}
document.querySelector('[data-py-restart]')?.addEventListener('click', () => restartPage());
