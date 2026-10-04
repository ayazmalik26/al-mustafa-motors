import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Loads the root .env (if present) into process.env without overriding existing values. */
export function loadRootEnv() {
  const file = resolve(ROOT, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}

/** Parses a postgres connection string into its parts. */
export function parseDatabaseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

export function isLocalHost(host) {
  return ['localhost', '127.0.0.1', '::1'].includes(host);
}

/** Resolves true when something accepts TCP connections on host:port. */
export function isPortOpen(host, port, timeoutMs = 800) {
  return new Promise((resolvePromise) => {
    const socket = net.connect({ host, port });
    const done = (open) => {
      socket.destroy();
      resolvePromise(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}
