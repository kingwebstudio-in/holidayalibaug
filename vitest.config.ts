import { defineConfig } from 'vitest/config';

// The SAME API/database suite runs against both data engines:
//   npm run test:postgres  (real PostgreSQL — set TEST_DATABASE_URL; its tables are TRUNCATED on every run)
//   npm run test:local     (embedded PostgreSQL, in memory — needs nothing)
const mode = process.env.TEST_DATA_MODE === 'postgres' ? 'postgres' : process.env.TEST_DATA_MODE === 'local' ? 'local' : (process.env.TEST_DATABASE_URL ? 'postgres' : 'local');

export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false, // postgres mode shares one database
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATA_MODE: mode,
      DATABASE_URL: mode === 'postgres' ? (process.env.TEST_DATABASE_URL || 'postgresql://holiday:localdevpass@127.0.0.1:5432/holidayalibag_test') : '',
      LOCAL_DATA_DIR: 'memory://',
      LOCAL_AUTO_SEED: 'false',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-123456',
      WHATSAPP_NUMBER: '',
      CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', CLOUDINARY_URL: '',
      TEST_DATA_MODE: mode,
    },
  },
});
