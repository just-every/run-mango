import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';
export default defineConfig({testDir:'.',testMatch:'*.journeys.ts',fullyParallel:false,workers:1,retries:0,timeout:180000,
  outputDir:evidenceDirectory('campaign-results'),reporter:'list',use:{headless:true,launchOptions:{args:['--use-mock-keychain','--password-store=basic']},trace:'off'}});
