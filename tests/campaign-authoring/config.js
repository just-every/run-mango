import { evidenceDirectory } from '../support/artifacts.mjs';
import {defineConfig} from '@playwright/test';
import { fixtureServer } from '../support/fixture-server.mjs';
const { baseURL, webServer } = await fixtureServer();
export default defineConfig({outputDir: evidenceDirectory('campaign-authoring'),testDir:'.',testMatch:'**/*.spec.ts',workers:1,fullyParallel:false,reporter:'list',timeout:120000,use:{baseURL,headless:true,launchOptions:{args:["--use-mock-keychain","--password-store=basic"]},actionTimeout:15000},webServer});
