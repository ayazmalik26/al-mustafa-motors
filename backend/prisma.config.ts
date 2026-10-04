import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Variables already set in the shell win; then backend/.env, then the root .env.
config({ path: ['.env', '../.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. Hosted Postgres such as Neon provides a pooled
    // DATABASE_URL for the app and a direct one for the CLI — set DIRECT_DATABASE_URL to the latter.
    // Falls back to an empty string so `prisma generate` works without a database (e.g. Docker builds).
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
