import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://trux-artifacts.github.io',
  integrations: [sitemap()],
});
