#!/usr/bin/env node
/** Root `postinstall`: installs the backend, frontend and e2e packages. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib/env.mjs';

if (process.env.SKIP_SUBPROJECT_INSTALL) process.exit(0);

for (const dir of ['backend', 'frontend', 'e2e']) {
  const cwd = resolve(ROOT, dir);
  if (!existsSync(resolve(cwd, 'package.json'))) continue;
  console.log(`\n▸ Installing ${dir} dependencies…`);
  const result = spawnSync('npm install --no-audit --no-fund', { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
