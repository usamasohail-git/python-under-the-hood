// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkPyCell from './src/lib/remark-pycell.mjs';
import remarkBaseLinks from './src/lib/remark-base-links.mjs';

const base = process.env.SITE_BASE || '/';

// For GitHub Pages under a repo name, build with SITE_BASE=/repo-name/
export default defineConfig({
  site: process.env.SITE_URL || 'https://python-under-the-hood.vercel.app',
  base,
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  markdown: {
    remarkPlugins: [remarkPyCell, [remarkBaseLinks, base]],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
