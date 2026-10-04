#!/usr/bin/env node
/**
 * `npm run setup` — one-time local setup.
 *  1. Creates `.env` from `.env.example` (with a random JWT secret) if missing.
 *  2. Makes sure PostgreSQL is reachable (starts the embedded server temporarily if needed).
 *  3. Generates the Prisma client, applies migrations and seeds demo data.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadRootEnv, parseDatabaseUrl, isLocalHost, isPortOpen } from './lib/env.mjs';
import { startEmbeddedPostgres } from './lib/embedded-db.mjs';

const envFile = resolve(ROOT, '.env');
if (!existsSync(envFile)) {
  copyFileSync(resolve(ROOT, '.env.example'), envFile);
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(envFile, readFileSync(envFile, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`));
  console.log('✔ Created .env from .env.example (random JWT_SECRET generated)');
}
loadRootEnv();

mkdirSync(resolve(ROOT, 'backend', process.env.UPLOAD_DIR || 'uploads', 'vehicles'), { recursive: true });

const run = (args, opts = {}) => {
  console.log(`\n▸ npm ${args.join(' ')}`);
  // Static, trusted arguments — passed as one command string (Windows needs a shell to run npm).
  const r = spawnSync(`npm ${args.join(' ')}`, { cwd: resolve(ROOT, 'backend'), stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) throw new Error(`Command failed: npm ${args.join(' ')}`);
};

const { host, port, database } = parseDatabaseUrl(process.env.DATABASE_URL);
const testDb = process.env.TEST_DATABASE_URL ? parseDatabaseUrl(process.env.TEST_DATABASE_URL).database : null;
let embedded = null;

try {
  if (!(await isPortOpen(host, port))) {
    if (!isLocalHost(host)) throw new Error(`PostgreSQL is not reachable at ${host}:${port}`);
    console.log('▸ No PostgreSQL detected — starting the embedded development server');
    embedded = await startEmbeddedPostgres({
      databaseUrl: process.env.DATABASE_URL,
      extraDatabases: testDb && testDb !== database ? [testDb] : [],
      quiet: true,
    });
  } else {
    console.log(`✔ PostgreSQL reachable at ${host}:${port}`);
  }

  run(['run', 'prisma:generate']);
  run(['run', 'prisma:deploy']);
  run(['run', 'prisma:seed']);

  console.log('\n✔ Setup complete. Start everything with: npm run dev');
  console.log('  Website: http://localhost:4200   Admin: http://localhost:4200/admin/login');
} catch (err) {
  console.error(`\n✖ ${err.message}`);
  process.exitCode = 1;
} finally {
  if (embedded) await embedded.stop();
}
