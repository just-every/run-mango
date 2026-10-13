import { defineConfig } from '@playwright/test';
import { evidenceDirectory } from '../support/artifacts.mjs';
export default defineConfig({testDir:'.',testMatch:'**/*.spec.ts',outputDir:evidenceDirectory('audience-summary'),workers:1,fullyParallel:false,timeout:120000,reporter:'list',use:{headless:true,trace:'off'}});
