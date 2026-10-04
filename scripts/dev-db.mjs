#!/usr/bin/env node
/**
 * `npm run db:start`
 *
 * - If PostgreSQL is already reachable at DATABASE_URL (Docker, a native install,
 *   or a hosted database), this script does nothing and simply stays alive so
 *   `npm run dev` keeps running.
 * - Otherwise it starts an embedded PostgreSQL server for local development.
 */
import { loadRootEnv, parseDatabaseUrl, isLocalHost, isPortOpen } from './lib/env.mjs';
import { startEmbeddedPostgres } from './lib/embedded-db.mjs';

loadRootEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[db] DATABASE_URL is not set. Run `npm run setup` or copy .env.example to .env.');
  process.exit(1);
}

const { host, port, database } = parseDatabaseUrl(databaseUrl);
const testDb = process.env.TEST_DATABASE_URL ? parseDatabaseUrl(process.env.TEST_DATABASE_URL).database : null;

const keepAlive = () => setInterval(() => {}, 1 << 30);

if (await isPortOpen(host, port)) {
  console.log(`[db] PostgreSQL already reachable at ${host}:${port} — using it.`);
  keepAlive();
} else if (!isLocalHost(host)) {
  console.error(`[db] Cannot reach PostgreSQL at ${host}:${port}. Check DATABASE_URL.`);
  process.exit(1);
} else {
  const pg = await startEmbeddedPostgres({
    databaseUrl,
    extraDatabases: testDb && testDb !== database ? [testDb] : [],
    quiet: true,
  });
  console.log(`[db] Embedded PostgreSQL running on ${host}:${port} (database "${database}"). Ctrl+C to stop.`);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log('[db] Stopping PostgreSQL…');
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.on('SIGHUP', stop);
  keepAlive();
}
