import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/core/platform/db/schema.ts',
  out: './migrations/core',
});
