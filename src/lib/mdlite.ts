// Tiny, safe Markdown subset for quiz/exercise text written in YAML:
// paragraphs (blank lines), `code`, **bold**, *italic*. Everything else is escaped.
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(text: string): string {
  // Odd-indexed pieces are inside backticks: keep them literal (e.g. `a ** 2`).
  return text
    .trim()
    .split('`')
    .map((piece, i) =>
      i % 2
        ? `<code>${esc(piece)}</code>`
        : esc(piece)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>'),
    )
    .join('');
}

export function block(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`)
    .join('');
}
