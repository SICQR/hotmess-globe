import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load .env.local so tests can access Supabase keys
  const env = loadEnv(mode || 'test', process.cwd(), '');

  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['src/__tests__/integration/**/*.test.ts'],
      exclude: ['node_modules/**', 'dist/**'],
      testTimeout: 30000, // DB operations can be slow
      hookTimeout: 30000,
      env: {
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  };
});
