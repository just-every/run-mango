import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';
export default defineConfig({outputDir: evidenceDirectory('single-attempt-delivery'), testDir: '.', testMatch: ['receiver.spec.ts','receiver-configuration.spec.ts'], workers: 1, retries: 0, reporter: 'list' });
