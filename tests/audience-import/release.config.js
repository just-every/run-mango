import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';

export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', grep: /@release/,
  workers: 2, fullyParallel: true, retries: 0,
  outputDir: evidenceDirectory('release-capacity'), reporter: 'list',
});
