import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  // 'expo' makes drizzle-kit emit a JS migrations bundle importable in RN.
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
