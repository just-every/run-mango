import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'connection.spec.ts',workers:1,fullyParallel:false,timeout:60000,reporter:'list'});
