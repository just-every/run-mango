import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';
export default defineConfig({testDir:'.',testMatch:'model.spec.ts',workers:1,fullyParallel:false,retries:0,reporter:'list',outputDir:evidenceDirectory('campaign-results-model')});
