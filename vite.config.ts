import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { archiveOutputGuard } from './scripts/base-onboarding/archive-output.mjs';
import { docsSite } from './src/core/features/docs/build/plugin.ts';
import { excludeLocalVariables } from './vite/exclude-local-variables.ts';
// Only normal app development loads the local-only entry and checkout dev key.
// Explicit fixture/review configs and builds/preview retain their configured entry.
const local = (name: string) => process.env[name] ? {[name]: process.env[name]} : {};
export default defineConfig(({command, isPreview}) => {
 const authoringConfig = process.env.MANGO_AUTHORING_TEST_CONFIG;
 const runtime = authoringConfig !== undefined ? 'authoring' : process.env.MANGO_SYNTHETIC_REVIEW === '1' ? 'review' : 'app';
 const appDev = runtime === 'app' && command === 'serve' && !isPreview;
 // Explicit fixtures load tests/support or tests/campaign-authoring; synthetic
 // review selects tests/review/worker.ts. Their bootstrap imports the sample
 // JSON; normal app serving keeps both fixture sources closed.
 const fixtureSources = runtime === 'app' ? [] : ['tests', 'sample-data/initial.json'];
 return {
 cacheDir: fileURLToPath(new URL('./.cache/vite', import.meta.url)),
 plugins: [cloudflare({
  inspectorPort: false,
  configPath: authoringConfig ?? (runtime === 'review' ? 'wrangler.review.toml' : 'wrangler.toml'),
  persistState: {path: process.env.MANGO_AUTHORING_TEST_STATE ?? (runtime === 'review' ? '.seed/review-state' : '.wrangler/state')},
  ...(appDev ? {config: {main: './src/core/app/worker.dev.ts', vars: {...local('RER_DEV_ORIGIN'), ...local('RER_DEV_KEY'), ...local('RER_DEV_IDENTITY')}}} : process.env.RER_DEV_ORIGIN ? {config: {vars: {RER_DEV_ORIGIN: process.env.RER_DEV_ORIGIN}}} : {}),
  viteEnvironment: {name: 'ssr'},
 }), docsSite(), tanstackStart({prerender: {enabled: false, autoStaticPathsDiscovery: false, crawlLinks: false}}), react(), tailwindcss(), excludeLocalVariables(), archiveOutputGuard()],
 ...(process.env.MANGO_PREVIEW_OUT ? {environments: {client: {build: {outDir: `${process.env.MANGO_PREVIEW_OUT}/client`}}, ssr: {build: {outDir: `${process.env.MANGO_PREVIEW_OUT}/server`}}}} : {}),
 resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
 server: {host: '127.0.0.1', port: 15660, strictPort: true, allowedHosts: true, fs: {
  allow: ['src', 'public', 'node_modules', ...fixtureSources],
  // An explicit deny list replaces Vite's defaults; retain its sensitive-file
  // patterns as well as the checkout's private state and exports.
  deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.rer/**', '**/.seed/**', '**/exports/**', '**/*.rer'],
 }},
 };
});
