# Al-Mustafa Motors — Digital Showroom

A production-ready website and admin panel for **Al-Mustafa Motors**, a used & brand-new car showroom on Main University Road, Karachi.

Customers can browse, search, filter and sort the inventory, open a vehicle page with a photo gallery and full specifications, save vehicles, share them, contact the showroom on WhatsApp (with a pre-filled message about the exact car), call, send an enquiry, submit a sell / exchange request with photos, and find the showroom — in **English or Urdu (right-to-left)**.

Staff sign in to an admin panel to manage vehicles and photos, mark vehicles available / reserved / sold, feature vehicles on the homepage, follow up enquiries and sell requests, and edit business details and homepage content.

> **Demo data.** The seeded vehicles, prices, mileage, availability and photos are **sample data** for demonstration. They are flagged `isDemo`, labelled “Demo listing” on the site, excluded from search engines (`noindex`) and accompanied by a site-wide notice. The contact details (phone, WhatsApp, address, Facebook) come from the concept brief and **must be verified with the business owner before launch**. No business claims (years in business, customer numbers, reviews, warranties, finance) are made anywhere.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Tech stack](#2-tech-stack)
3. [Requirements](#3-requirements)
4. [Installation (quick start)](#4-installation-quick-start)
5. [Environment variables](#5-environment-variables)
6. [PostgreSQL setup](#6-postgresql-setup)
7. [Database migrations](#7-database-migrations)
8. [Seed data](#8-seed-data)
9. [Running the frontend](#9-running-the-frontend)
10. [Running the backend](#10-running-the-backend)
11. [Running tests](#11-running-tests)
12. [Production build](#12-production-build)
13. [Admin login](#13-admin-login)
14. [Deployment](#14-deployment)
15. [Image storage](#15-image-storage)
16. [WhatsApp configuration](#16-whatsapp-configuration)
17. [Project structure](#17-project-structure)
18. [API reference](#18-api-reference)
19. [Architecture & extending the system](#19-architecture--extending-the-system)
20. [Known limitations](#20-known-limitations)
21. [Pre-launch checklist](#21-pre-launch-checklist)

---

## 1. Project overview

| Area | What it does |
|---|---|
| **Homepage** | Cinematic hero (“Find a car that feels right.”), vehicle finder (make, model, condition, body type, min/max price, year → `/inventory?…`), featured vehicles from the database, services (buy, sell, exchange, assistance), “how it works”, sell/exchange call-to-action, showroom details with Google Map |
| **Inventory** `/inventory` | Debounced search (make/model/variant/year), filters (make, model, condition, body type, fuel, transmission, year range, price range, max mileage, availability), sorting (newest, price ↑/↓, year, mileage), pagination (12 per page), active-filter chips, all state in the URL (refresh-safe, shareable), skeleton / empty / error states, collapsible filter sheet on mobile |
| **Vehicle page** `/inventory/:slug` | Readable slugs (`/inventory/toyota-fortuner-2024`), gallery (large image, thumbnails, next/previous, keyboard arrows, touch swipe, fullscreen viewer, lazy loading, responsive `srcset`), full specs, price or “Price on request”, Available / Reserved / Sold status, WhatsApp / Call / Send enquiry, save, share, similar vehicles, sticky actions on mobile, SEO title/description/canonical/Open Graph/JSON-LD |
| **Sell / Exchange** `/sell-exchange` | Lead form (contact, vehicle, condition, intent, expected price, message, up to 6 photos) → saved to the database → confirmation with WhatsApp continuation |
| **About / Contact / Saved** | Business description (editable), showroom info + map, general enquiry form, saved vehicles (stored on the device) |
| **Admin** `/admin` | Login, dashboard (counts + 14-day leads chart), vehicles (create, edit, delete with confirmation, one-click status/“Mark sold”, featured toggle, photo upload / reorder / primary / delete / alt text), enquiries (filter, search, mark contacted/closed, WhatsApp, call, details + internal notes), sell requests (status workflow New → Contacted → Evaluating → Closed, photos), settings (business info, contact numbers, address, map URL + coordinates, hours, socials, homepage headline/subheading/hero image, demo notice) |
| **Bilingual** | English (LTR) and Urdu (RTL, Noto Nastaliq Urdu). One set of components; typed translation dictionaries; preference saved in `localStorage` (and a cookie so the server renders the right language) |

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | **Angular 22** (standalone components, signals, zoneless change detection, lazy-loaded routes, Reactive Forms, **server-side rendering** with hydration), **Tailwind CSS 4**, TypeScript 6 |
| Backend | **NestJS 12** (ESM), TypeScript, class-validator DTOs, Helmet, rate limiting (`@nestjs/throttler`), JWT in an httpOnly cookie, bcrypt password hashing, Multer + **sharp** image processing |
| Database | **PostgreSQL** (17/18) with **Prisma 7** (migrations, typed client, `@prisma/adapter-pg`) |
| Tests | Vitest (backend unit + API tests with Supertest against a real PostgreSQL test database, Angular unit tests), **Playwright** end-to-end tests (desktop + mobile) |
| Tooling | npm, `concurrently`, `embedded-postgres` (PostgreSQL without Docker for local dev), Docker Compose |

---

## 3. Requirements

- **Node.js 22.22+, 24.15+ or 26+** (developed and tested on Node 26.8, npm 11)
- **PostgreSQL 14+** — *optional for local development*: if nothing is listening on the `DATABASE_URL` port, the scripts start a bundled PostgreSQL 18 server automatically (from the `embedded-postgres` npm package; data in `.data/postgres`)
- For Docker deployment: Docker 24+ with Compose v2
- For end-to-end tests: Playwright’s Chromium (`npm --prefix e2e run install:browsers`) **or** an installed Chrome/Edge (`PW_CHANNEL=chrome`)

---

## 4. Installation (quick start)

```bash
npm install
```
Installs the root tooling and, via `postinstall`, the `backend`, `frontend` and `e2e` packages.

```bash
npm run setup
```
Creates `.env` from `.env.example` (with a random `JWT_SECRET`), starts PostgreSQL if needed, generates the Prisma client, applies migrations and seeds demo data + development accounts.

```bash
npm run dev
```
Starts the database (or reuses a running one), the API on **http://localhost:3000/api** and the website on **http://localhost:4200** (SSR dev server, with `/api` and `/uploads` proxied to the API).

- Website: http://localhost:4200
- Admin: http://localhost:4200/admin/login (see [Admin login](#13-admin-login))

You can also run the pieces separately: `npm run db:start`, `npm run dev:backend`, `npm run dev:frontend`.

> **npm 11 install scripts.** npm 11 blocks dependency install scripts unless approved. The approvals this project needs (Prisma engines, esbuild, embedded-postgres binaries) are already recorded in each `package.json` under `allowScripts`.

---

## 5. Environment variables

All configuration lives in **one root `.env`** (copied from [`.env.example`](.env.example) by `npm run setup`). The backend reads `backend/.env` first, then the root `.env`; real environment variables always win. **Never commit `.env`.** Nothing secret is ever shipped to the browser — the Angular app only talks to `/api`.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `production` enables stricter checks (e.g. strong `JWT_SECRET`, secure cookies by default) |
| `API_PORT` | `3000` | API port. Takes precedence over a generic `PORT` (which hosts like Render set — used when `API_PORT` is absent) |
| `FRONTEND_URL` | `http://localhost:4200` | Public site URL: canonical/Open Graph URLs, sitemap, CORS |
| `CORS_ORIGINS` | — | Extra comma-separated origins allowed to call the API |
| `DATABASE_URL` | `postgresql://almustafa:almustafa@localhost:5432/almustafa?schema=public` | Main database (on Neon: the pooled connection string) |
| `DIRECT_DATABASE_URL` | — | Direct (non-pooled) connection for migrations; needed with pooled hosted Postgres such as Neon |
| `TEST_DATABASE_URL` | `…/almustafa_test…` | Database used **and wiped** by the API test suite |
| `JWT_SECRET` | random (setup) | Session signing secret — ≥32 random characters in production |
| `JWT_EXPIRES_IN` | `12h` | Session lifetime |
| `COOKIE_SECURE` | `false` (`true` in production) | Send the session cookie over HTTPS only |
| `TRUST_PROXY` | `0` | Number of reverse proxies in front of the API so rate limits see real visitor IPs (`1` behind nginx/Caddy, `2` for Netlify edge → Render) |
| `RATE_LIMIT_ENABLED` | `true` | Global 300 req/min/IP; login 20/min; enquiries 8/min; sell requests 6/min |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@almustafamotors.local` / `ChangeMe123!` | Development admin created by the seed |
| `BUSINESS_NAME`, `WHATSAPP_NUMBER`, `BUSINESS_PHONE`, `GOOGLE_MAPS_URL` | concept values | Written into the settings table on first seed; afterwards edit them in **Admin → Settings** |
| `STORAGE_DRIVER` | `local` | `local` or `cloudinary` (see [Image storage](#15-image-storage)) |
| `UPLOAD_DIR` / `PUBLIC_UPLOAD_BASE_URL` | `uploads` / `/uploads` | Local storage folder (relative to `backend/`) and public URL prefix |
| `MAX_UPLOAD_MB` | `8` | Maximum size per uploaded image |
| `CLOUDINARY_URL` | — | `cloudinary://<api_key>:<api_secret>@<cloud_name>` (or set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) |
| `CLOUDINARY_FOLDER` | `al-mustafa-motors` | Folder in the Cloudinary media library |
| `API_INTERNAL_URL` | `http://localhost:3000` | How the website’s server side reaches the API (on Netlify: the Render API URL) |
| `SSR_PORT` | `4000` | Production SSR server port |
| `NG_ALLOWED_HOSTS` | localhost only | **Required in production**: hostnames allowed in the `Host` header, e.g. `almustafamotors.pk,www.almustafamotors.pk` |
| `NG_TRUST_PROXY_HEADERS` | — | Proxy headers the SSR server may trust (e.g. `x-forwarded-host,x-forwarded-proto`) |
| `API_PROXY` | `true` | SSR server proxies `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt` to the API; set `false` if your reverse proxy does it |
| `PUBLIC_SITE_URL` | `http://localhost:4000` | Docker Compose only: public site URL passed to the API |

---

## 6. PostgreSQL setup

Pick **one**:

**A. Zero-install (default for local development).** Do nothing. `npm run setup` / `npm run dev` / `npm run db:start` start a real PostgreSQL 18 server from the `embedded-postgres` package, create the `almustafa` and `almustafa_test` databases (UTF-8) and store data in `.data/postgres`. Stop it with Ctrl+C.

**B. Docker.**
```bash
docker compose up -d postgres
```
Matches the default `DATABASE_URL` (user/password/db `almustafa`, port 5432). Create the test database once if you want to run the API tests:
```bash
docker compose exec postgres createdb -U almustafa almustafa_test
```

**C. Your own PostgreSQL** (native install or hosted). Create a UTF-8 database and user, then point `DATABASE_URL` (and `TEST_DATABASE_URL`) at it:
```sql
CREATE USER almustafa WITH PASSWORD 'choose-a-password';
CREATE DATABASE almustafa OWNER almustafa ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE almustafa_test OWNER almustafa ENCODING 'UTF8' TEMPLATE template0;
```
> The database must be **UTF-8** — Urdu text (addresses, descriptions) cannot be stored in WIN1252/LATIN1 databases.

If PostgreSQL is already reachable at `DATABASE_URL`, the scripts simply use it.

---

## 7. Database migrations

Migrations live in `backend/prisma/migrations` and are committed.

| Task | Command |
|---|---|
| Apply migrations (any environment) | `npm run db:deploy` (= `cd backend && npx prisma migrate deploy`) |
| Create a new migration after editing `schema.prisma` (development) | `npm run db:migrate` (= `cd backend && npx prisma migrate dev`) |
| Regenerate the Prisma client | `cd backend && npx prisma generate` (also runs on `npm install`) |
| Reset the database and re-seed (**destroys data**) | `npm run db:reset` |
| Browse data | `npm run db:studio` |

---

## 8. Seed data

```bash
npm run db:seed        # = cd backend && npx prisma db seed
```

The seed (`backend/prisma/seed.ts`) is safe to re-run:

- **Accounts** (created only if missing, passwords never overwritten): admin `admin@almustafamotors.local` and staff `staff@almustafamotors.local`, both with password `ChangeMe123!` (development only).
- **Settings** row (only if missing) with the concept contact details, Urdu address/description and the hero image.
- **15 demo vehicles** across Toyota, Honda, Suzuki, Hyundai and Kia (mixed used/brand-new, available/reserved/sold, some “Price on request”), upserted by slug, each with free Unsplash photos. All are flagged `isDemo: true` and their descriptions state that they are sample data.

The seed **refuses to run with `NODE_ENV=production`** unless `SEED_DEMO=true` is set explicitly.

**Creating real admin accounts** (any environment):
```bash
npm run admin:create -- --email owner@example.com --name "Owner" --password "a-long-strong-password"
npm run admin:create -- --email staff1@example.com --name "Sales" --password "another-strong-password" --role STAFF
```
Re-running with an existing email resets that user’s password and role.

---

## 9. Running the frontend

```bash
npm run dev:frontend          # = cd frontend && npm start  → http://localhost:4200
```
The Angular dev server renders pages on the server (SSR) and proxies `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt` to `http://localhost:3000` (see `frontend/proxy.conf.json`). The API must be running. Use another port with `cd frontend && npx ng serve --port 4201`.

---

## 10. Running the backend

```bash
npm run dev:backend           # = cd backend && npm run start:dev  → http://localhost:3000/api
```
Watch mode with automatic restarts. Useful checks:
```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/vehicles?make=Toyota&sort=price_asc"
```

---

## 11. Running tests

| Suite | Command | What it covers |
|---|---|---|
| Backend unit (66) | `npm run test:backend` | Vehicle filter/sort builder, search, slugs, phone validation/normalisation, auth service (hashing, login, token verification, deactivated users), DTO/form validation, vehicle service, image processing, Cloudinary storage driver, environment validation |
| Backend API (53) | `npm run test:api` | Boots the real Nest app against `TEST_DATABASE_URL` (migrated and wiped automatically): vehicles GET/list/filter/sort/paginate/facets, GET by slug, POST/PATCH/DELETE with auth + roles, image upload/primary/reorder/delete, enquiries POST/GET/PATCH, sell requests POST (multipart with photo)/GET/PATCH, auth cookie, settings, dashboard, sitemap/robots, security headers, error envelope |
| Frontend unit (55) | `npm run test:frontend` | URL⇄filter mapping, Netlify edge API proxy, WhatsApp message builder & encoding, i18n service (switching, RTL, persistence, every Urdu key present), number/price formatting, auth service & guards, enquiry form validation & submission, inventory page filtering, vehicle detail (specs, price on request, WhatsApp, SEO), language switch |
| All of the above | `npm test` | |
| End-to-end (31) | `npm run test:e2e` | Playwright against a **running** stack (`npm run dev` in another terminal): customer journey (home → inventory → filter Toyota → vehicle → details → WhatsApp), gallery, saved vehicles, 404s, finder → URL params, URL state survives refresh, search, sorting, pagination, empty state, enquiry → success → **verified in the database**, sell/exchange with photo → **verified in the database**, contact form, admin (login → dashboard → create → photos → edit → mark sold → enquiry → logout), settings change reflected in WhatsApp links, staff role restrictions, Urdu/RTL, mobile (no horizontal scroll on every page, sticky call/WhatsApp bar, mobile menu, filter sheet, touch-swipe gallery) |

End-to-end options: `E2E_BASE_URL` (default `http://localhost:4200`), `E2E_API_URL` (default `http://localhost:3000`), `PW_CHANNEL=chrome` to use an installed Chrome instead of downloading Chromium. Visual review screenshots at every breakpoint (375 → 1920 px):
```bash
cd e2e && SCREENSHOTS=1 npx playwright test --project=screenshots     # PowerShell: $env:SCREENSHOTS='1'; npx playwright test --project=screenshots
```

Type checking: `npm run typecheck`.

---

## 12. Production build

```bash
npm run build          # backend → backend/dist, frontend → frontend/dist (browser + Node SSR server)
npm run start:prod     # API on :3000 and SSR website on :4000 (same origin; /api proxied)
```
Run migrations before starting a new version: `npm run db:deploy`. In production set at least `NODE_ENV=production`, a strong `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL=https://your-domain`, `NG_ALLOWED_HOSTS=your-domain` and (behind HTTPS) `COOKIE_SECURE=true`.

The website has two server entries:
- `frontend/src/server.ts` — Web-standard handler used by **Netlify** (as an Edge Function) and the dev server. Built by `npm run build` in `frontend/` (or `npm run build:netlify` from the root).
- `frontend/src/server.node.ts` — Express server for **Docker, VPS and `start:prod`**. Built by `npm run build:node` in `frontend/` (what the root `npm run build` uses).

Initial JavaScript is ~120 kB gzipped; every page and the whole admin area are lazy-loaded chunks.

---

## 13. Admin login

| | Development only |
|---|---|
| URL | http://localhost:4200/admin/login |
| Admin | `admin@almustafamotors.local` / `ChangeMe123!` |
| Staff | `staff@almustafamotors.local` / `ChangeMe123!` |

> ⚠️ These accounts exist **for local development only**. Before going live, create real accounts with `npm run admin:create` and delete or reset the demo accounts (or never run the demo seed in production).

**Roles.** `ADMIN` can do everything. `STAFF` can manage vehicles, photos, enquiries and sell requests, but cannot delete vehicles or change settings (enforced by the API and hidden in the UI).

Sessions use a signed JWT in an **httpOnly, SameSite=Strict** cookie (12 h by default, survives browser restarts). Expired sessions redirect to the login page and return you to where you were.

---

## 14. Deployment

### Option A — Netlify (website) + Render (API) + Neon (database) + Cloudinary (photos)

```
Visitor ──► Netlify (Angular SSR edge function) ──/api, /sitemap.xml──► Render (NestJS API) ──► Neon (PostgreSQL)
                                                                              └──► Cloudinary (vehicle photos, CDN)
```
Netlify serves the website and forwards `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt` to the API, so everything lives on one domain and the admin session cookie works. Netlify can’t run the API or the database itself, hence Render and Neon. Config files: [`netlify.toml`](netlify.toml) and [`render.yaml`](render.yaml).

Netlify and Render deploy from a Git repository — push this project to GitHub (or GitLab/Bitbucket) first. Never commit `.env`.

1. **Database — Neon.** Create a project at [neon.tech](https://neon.tech) (pick a region near Karachi, e.g. AWS Singapore). From *Connection details* copy two strings: the **pooled** one (host contains `-pooler`) → `DATABASE_URL`, and the **direct** one → `DIRECT_DATABASE_URL`. Keep `?sslmode=require`.
2. **Photos — Cloudinary.** Create a free account at [cloudinary.com](https://cloudinary.com). In *Settings → API Keys* copy the **API environment variable** (`cloudinary://<key>:<secret>@<cloud_name>`) → `CLOUDINARY_URL`.
3. **API — Render.** *New → Blueprint* → select the repository. Render reads `render.yaml` and asks for `DATABASE_URL`, `DIRECT_DATABASE_URL`, `FRONTEND_URL` (use `https://example.com` for now) and `CLOUDINARY_URL`; `JWT_SECRET` is generated for you. Deploy — migrations run automatically on every start. Check `https://<your-api>.onrender.com/api/health`.
   - Create your admin account in the service’s **Shell** tab:
     `npm run admin:create -- --email you@example.com --name "Your Name" --password "a-long-strong-password"`
   - Optional demo inventory: `SEED_DEMO=true npx prisma db seed` (remember to remove it before launch).
   - The blueprint uses the **Starter** plan: free instances sleep when idle and take about a minute to wake, longer than Netlify waits (40 s), so the first visit after a quiet period would fail.
4. **Website — Netlify.** *Add new site → Import an existing project* → select the repository. Build settings come from `netlify.toml` (base `frontend`, command `npm run build`, publish `dist/frontend/browser`, plugin `@netlify/angular-runtime`). Before the first deploy add the environment variable **`API_INTERNAL_URL` = `https://<your-api>.onrender.com`** with scopes including **Functions** (edge functions only see variables with that scope, and changes need a redeploy). Deploy.
5. **Link them.** On Render set `FRONTEND_URL` to your Netlify URL (`https://<site>.netlify.app`, or your custom domain later) and redeploy — it drives canonical URLs, Open Graph links and the sitemap.
6. **Custom domain (optional).** Add it in Netlify (*Domain management*); the edge function accepts it automatically. Update `FRONTEND_URL` on Render again.
7. **Check.** Open the site, a vehicle page, `/sitemap.xml`, sign in at `/admin/login`, upload a photo (it should appear in your Cloudinary media library) and send a test enquiry.

### Option B — Docker Compose (single server)
```bash
cp .env.example .env            # set JWT_SECRET (long random), PUBLIC_SITE_URL, NG_ALLOWED_HOSTS, contact defaults
docker compose up --build -d
docker compose exec -e SEED_DEMO=true backend npx prisma db seed   # optional demo data
docker compose exec backend npm run admin:create -- --email you@example.com --name "You" --password "strong-password"
```
Services: `postgres` (data volume `pgdata`), `backend` (runs `prisma migrate deploy` on start; uploads volume `uploads`), `web` (SSR on port 4000, proxies `/api` and `/uploads` to the backend). Put a TLS-terminating reverse proxy (Caddy/nginx/Cloudflare) in front of port 4000, set `COOKIE_SECURE=true`, `TRUST_PROXY=true` and `NG_TRUST_PROXY_HEADERS=x-forwarded-host,x-forwarded-proto`.

### Option C — Node hosting (VPS, Render, Railway, Fly.io…)
1. Provision PostgreSQL and set `DATABASE_URL`.
2. Backend: `cd backend && npm ci && npm run build && npx prisma migrate deploy && node dist/main.js`.
3. Frontend: `cd frontend && npm ci && npm run build:node && node dist/frontend/server/server.mjs` with `API_INTERNAL_URL`, `SSR_PORT` and `NG_ALLOWED_HOSTS`.
4. Serve both under one domain (the SSR server already proxies `/api` and `/uploads`), or route `/api/*`, `/uploads/*`, `/sitemap.xml` and `/robots.txt` to the API in your reverse proxy and set `API_PROXY=false`.
5. Persist `backend/uploads`, or use `STORAGE_DRIVER=cloudinary` (next section).

Health check: `GET /api/health`. Sitemap: `https://your-domain/sitemap.xml`. Robots: `https://your-domain/robots.txt`.

---

## 15. Image storage

Uploads go through `MediaService` (`backend/src/modules/storage/media.service.ts`), which:
- accepts JPEG, PNG, WebP or AVIF up to `MAX_UPLOAD_MB` (default 8 MB), max 12 per request, max 30 per vehicle;
- **decodes and re-encodes every file with sharp** — non-images are rejected regardless of their declared type, EXIF orientation is applied and **metadata (incl. GPS) is stripped**;
- produces a large (≤1600 px) and a thumbnail (≤640 px) **WebP** used for responsive `srcset`s.

Files are written through the `StorageProvider` interface (`storage.provider.ts`). Each image row stores its public `url`, `thumbUrl` and the provider `storageKeys`, so deleting a vehicle or photo also deletes the files. Two drivers are included, selected with `STORAGE_DRIVER`:

| Driver | Where files go | Use for |
|---|---|---|
| `local` (default) | `backend/uploads/vehicles/<vehicleId>/…` (sell-request photos in `uploads/sell-requests/…`), served by the API at `/uploads/…` with long-lived caching | Local development, servers with a persistent disk |
| `cloudinary` | Your Cloudinary media library under `CLOUDINARY_FOLDER/vehicles/<vehicleId>/…`, served from Cloudinary’s CDN (`https://res.cloudinary.com/...`) | Netlify/Render and any host without a persistent disk |

For Cloudinary set `STORAGE_DRIVER=cloudinary` and `CLOUDINARY_URL` (or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). The API refuses to start if the driver is selected without credentials. Photos are still optimised by sharp before upload, so Cloudinary stores the same two WebP sizes. Photos uploaded earlier with the local driver keep working only while those files exist on that server.

**Adding S3 / Cloudflare R2:** implement `StorageProvider` (`put(key, buffer, contentType) → { key, url }` and `delete(key)`) — e.g. with `@aws-sdk/client-s3` — register it in `storage.module.ts` and allow the new `STORAGE_DRIVER` value in `config/env.validation.ts`. No controllers, services, database columns or frontend code change.

Seeded demo vehicles use externally hosted Unsplash URLs (no `storageKeys`), which the same code path displays.

---

## 16. WhatsApp configuration

The WhatsApp number is **not hard-coded** anywhere in the frontend. It lives in the database (`settings.whatsapp`), seeded from `WHATSAPP_NUMBER`, and is edited in **Admin → Settings** (stored normalised, e.g. `+923368440890`). Every WhatsApp button reads it from `/api/settings`.

Links use `https://wa.me/<digits>?text=<URL-encoded message>`. On a vehicle page the message is pre-filled (in the visitor’s language):

```
Assalam o Alaikum,

I am interested in:

Toyota Fortuner Legender
2024
Used

https://your-domain/inventory/toyota-fortuner-2024

Is this vehicle available?

Thank you.
```
After an enquiry or sell request is submitted, a WhatsApp “continue” button sends a summary with a reference number. In the admin panel, WhatsApp buttons open a chat with the **customer’s** number with a polite greeting. Message builders: `frontend/src/app/core/utils/whatsapp.ts`.

---

## 17. Project structure

```
al-mustafa-motors/
├── package.json            root scripts (setup, dev, build, test…) + embedded PostgreSQL runner
├── .env.example            every environment variable, documented
├── docker-compose.yml      postgres + backend + web (self-hosting)
├── netlify.toml            Netlify build (website)
├── render.yaml             Render blueprint (API)
├── scripts/                setup.mjs, dev-db.mjs, install-all.mjs
├── backend/                NestJS API
│   ├── prisma/             schema.prisma, migrations/, seed.ts
│   ├── scripts/            create-admin.ts
│   ├── src/
│   │   ├── main.ts, app.module.ts, app.setup.ts (helmet, CORS, validation, envelope, static uploads)
│   │   ├── config/         environment validation
│   │   ├── common/         decorators, response envelope + error filter, validation transforms, utils
│   │   ├── prisma/         PrismaService (pg driver adapter, startup retry)
│   │   └── modules/        auth, vehicles (+ images), enquiries, sell-requests, settings,
│   │                       dashboard, seo (sitemap/robots), storage, notifications, health
│   ├── test/               API tests (supertest) + helpers
│   └── Dockerfile
├── frontend/               Angular 22 SSR app
│   ├── src/server.ts       Netlify edge / dev-server entry (Angular SSR + fetch proxy to the API)
│   ├── src/server.node.ts  self-hosted Node SSR server (Express, /api proxy, security headers)
│   ├── src/styles.css      design tokens (Tailwind @theme) + component classes
│   └── src/app/
│       ├── core/           models, services, guards, interceptors, i18n (en/ur), utils
│       ├── shared/         ui (icons, dialog, pagination, states…), components (vehicle card,
│       │                   enquiry form, gallery image, map…), directives (reveal, swipe), validators
│       ├── layout/         public-layout (header, footer, mobile bar), admin-layout
│       └── features/       home, inventory, vehicle-detail, sell-exchange, about, contact, saved,
│                           not-found, admin/{login, dashboard, vehicles, enquiries, sell-requests, settings}
└── e2e/                    Playwright tests (desktop, mobile, screenshots)
```

---

## 18. API reference

All JSON responses use one envelope: `{ "success": true, "data": …, "meta"?: { page, pageSize, total, totalPages } }` or `{ "success": false, "statusCode": 404, "message": "Vehicle not found", "errors"?: { field: [messages] } }`.

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/vehicles` | public | List. Query: `q, make, model, condition, bodyType, fuelType, transmission, status, minYear, maxYear, minPrice, maxPrice, minMileage, maxMileage, featured, ids, excludeId, sort (newest\|price_asc\|price_desc\|year_desc\|mileage_asc), page, pageSize ≤100` |
| `GET /api/vehicles/facets` | public | Filter options with counts |
| `GET /api/vehicles/:slug` | public | One vehicle with all images |
| `GET /api/vehicles/id/:id` | staff | One vehicle by id (admin edit) |
| `POST /api/vehicles` | staff | Create (slug generated from make-model-year, de-duplicated) |
| `PATCH /api/vehicles/:id` | staff | Update any field (status changes maintain `soldAt`) |
| `DELETE /api/vehicles/:id` | **admin** | Delete vehicle + image files |
| `GET/POST /api/vehicles/:id/images` | staff | List / upload (`multipart`, field `images`) |
| `PATCH /api/vehicles/:id/images/reorder` | staff | `{ imageIds: [...] }` |
| `PATCH /api/vehicles/:id/images/:imageId` | staff | `{ isPrimary?, alt? }` |
| `DELETE /api/vehicles/:id/images/:imageId` | staff | Delete photo (next photo becomes primary) |
| `POST /api/enquiries` | public, rate-limited | `{ name, phone, email?, message, vehicleId?, source?, locale? }` |
| `GET /api/enquiries`, `GET/PATCH /api/enquiries/:id` | staff | List (`status, q, page`) / view / update `{ status?, notes? }` |
| `POST /api/sell-requests` | public, rate-limited | JSON or multipart with up to 6 `images` |
| `GET /api/sell-requests`, `GET/PATCH /api/sell-requests/:id` | staff | List (`status, intent, q, page`) / view / update |
| `GET /api/settings` | public | Business settings + derived `siteUrl`, `mapEmbedUrl` |
| `PATCH /api/settings`, `POST /api/settings/hero-image` | **admin** | Update settings / upload hero image |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | — | Session cookie management |
| `GET /api/dashboard` | staff | Counts, 14-day leads, recent leads, inventory by make |
| `GET /api/health` | public | Liveness + database check |
| `GET /sitemap.xml`, `GET /robots.txt` | public | SEO |

---

## 19. Architecture & extending the system

A **modular monolith**: one NestJS API with feature modules and one Angular app with feature folders — no microservices, queues or caches were needed.

Designed extension points:
- **Cloud image storage** → new `StorageProvider` (see §15).
- **Email / SMS / WhatsApp Business API notifications** → every new enquiry and sell request already goes through `NotificationsService.notify()`; add a `NotificationChannel` provider in `notifications.module.ts`.
- **Customer accounts & saved vehicles in the cloud** → saved vehicles live behind `FavoritesService` (frontend); swap its storage for an API without touching components. `User.role` can gain a `CUSTOMER` value.
- **Vehicle comparison, financing calculator, appointment booking** → new lazy feature folders + Nest modules; vehicles already expose structured specs and prices.
- **Analytics / CRM** → enquiries and sell requests carry `source`, `locale`, status workflow and notes; the notification channel is a natural webhook point.
- **Multiple locations / dealerships** → settings are a single row today (id = 1); add `Location`/`Dealership` tables and a foreign key on vehicles/leads.
- **More languages** → add a dictionary file typed as `Translations`; the compiler lists any missing keys.

Security summary: Helmet headers, strict CORS, global DTO validation (unknown fields rejected), rate limits, bcrypt (cost 12), short-lived JWT in httpOnly SameSite=Strict cookie, role checks on every protected route, users re-checked on each request (deactivation takes effect immediately), constant-time-ish login, Prisma parameterised queries, image re-encoding + size/type/count limits, honeypot fields on public forms, SSR host allow-list, path-traversal-safe storage keys, `noindex` for admin and demo listings.

---

## 20. Known limitations

- **Contact details and opening hours are concept data** — verify with the business owner (Admin → Settings). Map coordinates are not set; the embedded map searches by business name + address until latitude/longitude are entered.
- **Demo inventory** uses Unsplash photos; some vehicles reuse generic photos of the right model, and several are older model years than their listing.
- The **admin panel is English-only** (the public site is fully bilingual).
- Saved vehicles are stored per device/browser (no customer accounts yet).
- No email/SMS notifications are sent yet — the hook exists (§19).
- Local image storage needs a persistent disk/volume in production (or a cloud `StorageProvider`).
- The Docker setup was written for this project but **could not be executed on the development machine (Docker is not installed there)**; everything else (embedded PostgreSQL, dev servers, production build + `start:prod`, all test suites) was run and verified.

---

## 21. Pre-launch checklist

- [ ] Verify phone, WhatsApp, address, hours and social links with the owner; enter map coordinates (Admin → Settings)
- [ ] Remove demo vehicles (or never seed them in production) and turn off the **demo notice** (Admin → Settings)
- [ ] Create real admin/staff accounts with `npm run admin:create`; remove the development accounts
- [ ] Set `NODE_ENV=production`, a strong `JWT_SECRET`, `FRONTEND_URL`, `NG_ALLOWED_HOSTS`, `COOKIE_SECURE=true`, `TRUST_PROXY=true` (behind a proxy)
- [ ] Serve over HTTPS; persist uploads or configure cloud storage; schedule PostgreSQL backups
- [ ] Submit `https://your-domain/sitemap.xml` to Google Search Console
