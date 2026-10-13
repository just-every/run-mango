import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';
export default defineConfig({outputDir: evidenceDirectory('settings-sender'), testDir: '.', testMatch: '**/*.spec.ts', workers: 1, fullyParallel: false, reporter: 'list', timeout: 60_000,
  use: {channel: process.env.PLAYWRIGHT_CHANNEL} });
