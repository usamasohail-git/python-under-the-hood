// Prefix root-relative Markdown links ("/part-2/section-02/") with the site's base path, so lesson
// links keep working when the site is built under a sub-path (e.g. GitHub Pages: SITE_BASE=/repo/).
function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach((child) => walk(child, fn));
}

export default function remarkBaseLinks(base = '/') {
  const prefix = base.replace(/\/$/, '');
  return (tree) => {
    if (!prefix) return;
    walk(tree, (node) => {
      if ((node.type === 'link' || node.type === 'definition') && node.url.startsWith('/') && !node.url.startsWith('//')
          && !node.url.startsWith(prefix + '/')) {
        node.url = prefix + node.url;
      }
    });
  };
}
