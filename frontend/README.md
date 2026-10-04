# Al-Mustafa Motors — website (Angular 22, SSR)

This is the public website and admin panel. See the [main README](../README.md) for setup, environment variables, tests and deployment.

| Task | Command (from this folder) |
|---|---|
| Dev server with SSR on http://localhost:4200 (API proxied to :3000) | `npm start` |
| Production build (browser + SSR server) | `npm run build` |
| Run the production SSR server | `npm run serve:ssr` |
| Unit tests (Vitest) | `npm test` |
| Type check | `npm run typecheck` |

Code layout: `src/app/core` (models, services, i18n, guards, interceptors, utils), `src/app/shared` (UI kit, reusable components, directives, validators), `src/app/layout` (public and admin layouts), `src/app/features` (one folder per page / admin area), `src/styles.css` (design tokens and component classes), `src/server.ts` (production server).
