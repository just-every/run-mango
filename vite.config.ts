import { demoSockets } from './src/vendor/base/demo/vite.mjs';
import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { existsSync } from 'node:fs';
import { defineConfig, type UserConfig } from 'vite';
import { archiveOutputGuard } from '@runeditrun/rer/archive-output';
import { docsSite } from './src/core/features/docs/build/plugin.ts';
import { excludeLocalVariables } from './vite/exclude-local-variables.ts';
import { privatePreloads } from './vite/private-preloads.ts';
// Only normal app development loads the local-only entry and checkout dev key.
// Explicit fixture/review configs and builds/preview retain their configured entry.
const local = (name: string) => process.env[name] ? {[name]: process.env[name]} : {};
export default defineConfig(async ({command, isPreview}): Promise<UserConfig> => {
 const authoringConfig = process.env.MANGO_AUTHORING_TEST_CONFIG;
 const runtime = authoringConfig !== undefined ? 'authoring' : process.env.MANGO_SYNTHETIC_REVIEW === '1' ? 'review' : 'app';
 const appDev = runtime === 'app' && command === 'serve' && !isPreview;
 // The installer preview builds the local Worker into its own output folder.
 // Ordinary production builds use a separate config, keeping local dev and
 // migration settings untouched throughout the build.
 const productionBuild = runtime === 'app' && command === 'build' && !process.env.MANGO_PREVIEW_OUT;
 // Export's unserved-directory check loads this config in build mode after an
 // upgrade, before the first build has generated the production config.
 if (productionBuild && !existsSync('wrangler.production.toml')) {
  // @ts-expect-error The generator is a Node-only ESM build script.
  await import('./scripts/generate-production-wrangler-config.mjs');
 }
 // Explicit fixtures load tests/support or tests/campaign-authoring; synthetic
 // review selects tests/review/worker.ts. Their bootstrap imports the sample
 // JSON; normal app serving keeps both fixture sources closed.
 const fixtureSources = runtime === 'app' ? (process.env.RER_DEMO === '1' ? ['sample-data/initial.json'] : []) : ['tests', 'sample-data/initial.json'];
 return {
 cacheDir: fileURLToPath(new URL('./.cache/vite', import.meta.url)),
 plugins: [demoSockets(), cloudflare({
  inspectorPort: false,
  configPath: authoringConfig ?? (runtime === 'review' ? 'wrangler.review.toml' : productionBuild ? 'wrangler.production.toml' : 'wrangler.toml'),
  persistState: {path: process.env.RER_STATE_DIR ?? process.env.MANGO_AUTHORING_TEST_STATE ?? (runtime === 'review' ? '.seed/review-state' : '.wrangler/state')},
  ...(appDev ? {config: {main: './src/core/app/worker.dev.ts', vars: {...local('RER_DEV_ORIGIN'), ...local('RER_DEV_KEY'), ...local('RER_DEV_IDENTITY'), ...local('RER_DEMO'), ...local('RER_DEMO_EXPIRES')}}} : process.env.RER_DEV_ORIGIN ? {config: {vars: {RER_DEV_ORIGIN: process.env.RER_DEV_ORIGIN}}} : {}),
  viteEnvironment: {name: 'ssr'},
 }), docsSite(), privatePreloads(), tanstackStart({prerender: {enabled: false, autoStaticPathsDiscovery: false, crawlLinks: false}}), react(), tailwindcss(), excludeLocalVariables(), archiveOutputGuard()],
 ...(process.env.MANGO_PREVIEW_OUT ? {environments: {client: {build: {outDir: `${process.env.MANGO_PREVIEW_OUT}/client`}}, ssr: {build: {outDir: `${process.env.MANGO_PREVIEW_OUT}/server`}}}} : {}),
 resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
 server: {host: '127.0.0.1', port: 15660, strictPort: true, allowedHosts: true,
  // Fresh isolated fixtures observe current file stats, not delayed native
  // watcher events from checkout creation. Actual source edits still reload.
  ...(runtime === 'authoring' ? {watch: {usePolling: true}} : {}),
  fs: {
  allow: ['src', 'public', 'node_modules', ...fixtureSources],
  // An explicit deny list replaces Vite's defaults; retain its sensitive-file
  // patterns as well as the checkout's private state and exports.
  deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.rer/**', '**/.seed/**', '**/exports/**', '**/*.rer'],
 }},
 };
});
