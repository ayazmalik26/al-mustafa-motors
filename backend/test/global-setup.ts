import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { applyTestEnv } from './test-env.js';

/** Applies migrations to the test database once before the API suite runs. */
export function setup() {
  applyTestEnv();
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
}

export function teardown() {
  rmSync('uploads-test', { recursive: true, force: true });
}
