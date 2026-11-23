// Light/dark toggle. Every click flips the *visible* theme, so no click is ever wasted.
// When the choice matches the OS preference we stop overriding and follow the OS again.
// The initial theme is applied by an inline script in <head> to avoid a flash.
const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const media = window.matchMedia('(prefers-color-scheme: dark)');
type Theme = 'light' | 'dark';

function saved(): Theme | null {
  try {
    const v = localStorage.getItem('pdd:theme');
    return v === 'light' || v === 'dark' ? v : null;
  } catch { return null; }
}

const system = (): Theme => (media.matches ? 'dark' : 'light');
const effective = (): Theme => saved() ?? system();

function render() {
  const theme = effective();
  if (saved()) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  if (btn) {
    btn.dataset.mode = theme;
    const next = theme === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', `Switch to ${next} mode`);
    btn.title = `Switch to ${next} mode`;
  }
}

btn?.addEventListener('click', () => {
  const next: Theme = effective() === 'dark' ? 'light' : 'dark';
  try {
    if (next === system()) localStorage.removeItem('pdd:theme');   // back to following the OS
    else localStorage.setItem('pdd:theme', next);
  } catch { /* storage unavailable: still switch for this page view */
    document.documentElement.dataset.theme = next;
    if (btn) btn.dataset.mode = next;
    return;
  }
  render();
});

// Follow live OS changes while no explicit choice is saved.
media.addEventListener('change', render);
render();
