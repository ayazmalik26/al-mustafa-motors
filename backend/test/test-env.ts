import { config } from 'dotenv';

/** Points the app at the test database and test upload folder. Shared by global setup and each worker. */
export function applyTestEnv() {
  // Workers inherit the environment prepared by global setup.
  if (process.env.AM_TEST_ENV_APPLIED === '1') return;
  config({ path: ['.env', '../.env'], quiet: true });
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL must be set (see .env.example)');
  if (testUrl === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL — the test suite wipes it.');

  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = 'test';
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.UPLOAD_DIR = 'uploads-test';
  process.env.COOKIE_SECURE = 'false';
  process.env.FRONTEND_URL = 'http://localhost:4200';
  process.env.JWT_SECRET ||= 'test-secret-for-api-tests-only-0123456789';
  process.env.AM_TEST_ENV_APPLIED = '1';
}
