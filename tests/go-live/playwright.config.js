import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';
export default defineConfig({testDir:'.',testMatch:'*.journeys.ts',fullyParallel:false,workers:1,retries:0,timeout:900000,
  outputDir:evidenceDirectory('go-live'),reporter:'list',use:{launchOptions:{args:['--use-mock-keychain','--password-store=basic']},headless:true,trace:'off'}});
