import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';
export default defineConfig({testDir:'.',testMatch:'*.journeys.ts',fullyParallel:false,workers:1,retries:0,timeout:900000,
  outputDir:evidenceDirectory('move-in'),reporter:'list',use:{headless:true,trace:'off',actionTimeout:30000,navigationTimeout:60000}});
