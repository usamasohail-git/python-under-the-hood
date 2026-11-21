// @ts-check
import { defineConfig } from 'astro/config';
import remarkPyCell from './src/lib/remark-pycell.mjs';

// For GitHub Pages under a repo name, build with SITE_BASE=/repo-name/
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.github.io',
  base: process.env.SITE_BASE || '/',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkPyCell],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
