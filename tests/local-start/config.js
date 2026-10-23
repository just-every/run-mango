import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: '*.journey.ts', workers: 1, fullyParallel: false,
  timeout: 180000, expect: { timeout: 15000 }, use: { headless: true, launchOptions: {args: ['--use-mock-keychain','--password-store=basic']} },
  outputDir: evidenceDirectory('local-start'), reporter: 'list' });
