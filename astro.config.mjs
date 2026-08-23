import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://chops77.github.io',
  base: '/YuJung/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  i18n: {
    locales: ['en', 'zh-tw', 'zh-cn'],
    defaultLocale: 'zh-tw',
    routing: { prefixDefaultLocale: true },
  },
});