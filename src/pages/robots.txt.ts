import type { APIRoute } from 'astro';

// Generated so the sitemap URL follows the configured `site` (SITE_URL), e.g. a custom domain.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', new URL(import.meta.env.BASE_URL, site));
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
