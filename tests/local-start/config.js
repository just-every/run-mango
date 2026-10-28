import {launchOptions} from '../support/browser.mjs';
import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: '*.journey.ts', workers: 1, fullyParallel: false,
  timeout: 180000, expect: { timeout: 15000 }, use: {viewport:{width:1440,height:1000}, headless: true, launchOptions },
  outputDir: evidenceDirectory('local-start'), reporter: 'list' });
