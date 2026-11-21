// Light / dark / system theme toggle. The initial theme is applied by an inline
// script in the <head> to avoid a flash; this wires up the button.
const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const order = ['system', 'light', 'dark'] as const;
type Mode = (typeof order)[number];

function current(): Mode {
  try { return (localStorage.getItem('pdd:theme') as Mode) || 'system'; } catch { return 'system'; }
}
function apply(mode: Mode) {
  if (mode === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  try { localStorage.setItem('pdd:theme', mode); } catch { /* ignore */ }
  if (btn) {
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', `Theme: ${mode}. Click to change.`);
    btn.title = `Theme: ${mode}`;
  }
}
btn?.addEventListener('click', () => apply(order[(order.indexOf(current()) + 1) % order.length]));
apply(current());
