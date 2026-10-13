import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';
export default defineConfig({outputDir: evidenceDirectory('prior-approval'),testDir:'.',testMatch:'**/*.spec.ts',workers:1,fullyParallel:false,reporter:'list',timeout:30_000});
