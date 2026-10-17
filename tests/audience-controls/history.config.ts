import {defineConfig} from '@playwright/test';
import {evidenceDirectory} from '../support/artifacts.mjs';

export default defineConfig({
  testDir:'.',testMatch:'contact-history.spec.ts',workers:1,fullyParallel:false,
  outputDir:evidenceDirectory('contact-history'),reporter:'list',timeout:180000,
  use:{headless:true,actionTimeout:15000},
});
