// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkPyCell from './src/lib/remark-pycell.mjs';

// For GitHub Pages under a repo name, build with SITE_BASE=/repo-name/
export default defineConfig({
  site: process.env.SITE_URL || 'https://python-under-the-hood.vercel.app',
  base: process.env.SITE_BASE || '/',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  markdown: {
    remarkPlugins: [remarkPyCell],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
