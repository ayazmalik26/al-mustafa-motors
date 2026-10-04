interface NetlifyGlobal {
  env?: { get(key: string): string | undefined };
}

/**
 * Reads a server-side environment variable in every runtime this app is rendered in:
 * Netlify Edge Functions (`Netlify.env`) and Node.js (`process.env`).
 */
export function readServerEnv(name: string): string | undefined {
  const netlify = (globalThis as { Netlify?: NetlifyGlobal }).Netlify;
  const value = netlify?.env?.get(name) ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  // Netlify's polyfill stores missing values as the literal string "undefined".
  return value && value !== 'undefined' ? value : undefined;
}
