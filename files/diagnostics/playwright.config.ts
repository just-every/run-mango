import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'*.spec.ts',workers:1,retries:0,timeout:300000,outputDir:'../../diagnostic-output',reporter:'list',use:{viewport:{width:1440,height:1000},launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}}});
