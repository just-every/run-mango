import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';

export default defineConfig({outputDir: evidenceDirectory('sender-settings-unit'),
  testDir: '.',
  testMatch: ['sender.spec.ts', 'routes-d1.spec.ts'],
  workers: 1,
  retries: 0,
});
