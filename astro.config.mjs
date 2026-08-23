import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // TODO: replace <user> and <repo>
  site: 'https://<user>.github.io',
  base: '/<repo>',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  i18n: {
    locales: ['en', 'zh-tw', 'zh-cn'],
    defaultLocale: 'zh-tw',
    routing: { prefixDefaultLocale: true },
  },
});