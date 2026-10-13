import { evidenceDirectory } from '../support/artifacts.mjs';
import {defineConfig} from '@playwright/test';
export default defineConfig({outputDir: evidenceDirectory('campaign-authoring'),testDir:'.',testMatch:'**/*.spec.ts',workers:1,fullyParallel:false,reporter:'list',timeout:120000,use:{headless:true,actionTimeout:15000}});
