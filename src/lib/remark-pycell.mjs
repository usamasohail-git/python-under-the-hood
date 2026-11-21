// Turns ```python run fences into interactive <py-cell> elements.
// Plain ```python fences stay static (highlighted by Shiki).
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function walk(node, fn) {
  if (node.children) node.children.forEach((child, i) => { fn(child, i, node); walk(child, fn); });
}

export default function remarkPyCell() {
  return (tree) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== 'code' || node.lang !== 'python') return;
      const meta = (node.meta || '').split(/\s+/);
      if (!meta.includes('run')) return;
      const fresh = meta.includes('fresh') ? ' data-fresh' : '';
      parent.children[index] = {
        type: 'html',
        value: `<py-cell${fresh}><pre class="py-src"><code>${esc(node.value)}</code></pre></py-cell>`,
      };
    });
  };
}
