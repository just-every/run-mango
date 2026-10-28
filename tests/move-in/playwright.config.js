import {launchOptions} from '../support/browser.mjs';
import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';
export default defineConfig({testDir:'.',testMatch:'*.journeys.ts',fullyParallel:false,workers:1,retries:0,timeout:900000,
  outputDir:evidenceDirectory('move-in'),reporter:'list',use:{viewport:{width:1440,height:1000},launchOptions,headless:true,trace:'off',actionTimeout:30000,navigationTimeout:60000}});
