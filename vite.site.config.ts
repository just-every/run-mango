import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { docsSite } from './src/core/features/docs/build/plugin.ts';

// The run site's build (rer build --site, src/site/pages.tsx): only the plugins its pages need, the docs module, React
// and the app stylesheet's Tailwind. Never the app's vite.config.ts, whose Worker and Start plugins do not run in Node.
export default defineConfig({
  cacheDir: fileURLToPath(new URL('./.cache/vite-site', import.meta.url)),
  plugins: [docsSite(), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
