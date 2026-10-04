import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, parseDatabaseUrl } from './env.mjs';

/**
 * Starts a real PostgreSQL server from the `embedded-postgres` npm package.
 * This is a development convenience for machines without Docker or a local
 * PostgreSQL install. Data lives in `.data/postgres` (git-ignored).
 */
export async function startEmbeddedPostgres({ databaseUrl, extraDatabases = [], quiet = false }) {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const cfg = parseDatabaseUrl(databaseUrl);
  const dataDir = resolve(ROOT, '.data', 'postgres');
  const firstRun = !existsSync(resolve(dataDir, 'PG_VERSION'));
  mkdirSync(resolve(ROOT, '.data'), { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port,
    persistent: true,
    // UTF-8 is required for Urdu text; without this Windows clusters default to WIN1252.
    initdbFlags: ['--encoding=UTF8', '--no-locale'],
    onLog: quiet ? () => {} : (msg) => process.stdout.write(`[postgres] ${msg}`),
    onError: (err) => console.error('[postgres]', err?.toString?.() ?? err),
  });

  if (firstRun) {
    console.log(`[db] Initialising a new PostgreSQL cluster in ${dataDir}`);
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  try {
    for (const name of [cfg.database, ...extraDatabases].filter(Boolean)) {
      const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
      if (!rowCount) {
        await client.query(
          `CREATE DATABASE "${name.replace(/"/g, '')}" ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`,
        );
        console.log(`[db] Created database "${name}"`);
      }
    }
  } finally {
    await client.end();
  }

  return pg;
}
