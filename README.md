# StockFlow

StockFlow is a small, multi-tenant inventory management MVP. Organizations can manage a product catalog, monitor stock levels, and configure a default low-stock threshold. The React client and Express API are served from one origin in production; SQLite stores application data.

## Project Structure

- `frontend/` — React pages/components, Vite entry point, and frontend build output.
- `backend/server/` — Express app, API routes, SQLite setup, and integration tests.
- Root `package.json` — shared dependency installation and commands for both apps.
- `data/` — local SQLite database created at runtime.

## Features

- Email/password signup and login with bcrypt password hashing.
- Random, expiring server-side sessions sent as HTTP-only, SameSite=Lax cookies.
- Organization-scoped product creation, listing, search, editing, and deletion.
- Direct quantity edits and signed stock adjustments with optional notes.
- One user per organization in this MVP; signup creates a new organization and its owner atomically.
- Case-insensitive SKU uniqueness within each organization.
- Inventory dashboard totals and low-stock list using `quantity <= effective threshold`.
- Organization default low-stock settings, used when a product has no custom threshold.
- Responsive Dashboard, Products, and Settings views with loading, empty, validation, and error states.

All product, dashboard, and settings queries derive organization scope from the authenticated session. A client-supplied organization ID is not used to select tenant data. The database enforces one user per organization; invitations and shared organizations are outside the current MVP scope.

## Tech Stack

- Frontend: React, React Router, Vite
- Backend: Node.js 20+, Express 5
- Database: SQLite via `better-sqlite3`
- Tests: Node.js test runner and Supertest
- Password hashing: `bcryptjs`

## Requirements

- Node.js 20 or newer
- npm

## Setup

Run these commands from the repository root:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`; Vite chooses another available port if needed). The Express API defaults to `http://localhost:3001`; Vite proxies `/api` to the port configured by `PORT`.

Check the API and database connection at `http://localhost:3001/api/health` (replace the port if `PORT` is customized). A healthy response is:

```json
{"status":"ok","database":"ok"}
```

## Environment Variables

Copy `.env.example` to `.env` for local development. Do not put credentials or secrets in source control.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Express listening port. The Vite development proxy uses the same value. |
| `DATABASE_PATH` | `./data/stockflow.sqlite` | SQLite database file path. Relative paths resolve from the project working directory. |
| `NODE_ENV` | unset (the example sets `development`) | Set to `production` in deployment to enable the `Secure` session-cookie attribute. |

There is no JWT or database password secret: session tokens are generated randomly, and only their SHA-256 hashes are stored. Production must use HTTPS so browsers send secure session cookies.

## Database Setup and Migrations

The server creates the database directory and tables on startup. It enables SQLite foreign keys and WAL mode. Startup migrations add the organization default-threshold column and product adjustment metadata columns when missing; these migrations are idempotent, and existing organizations receive a threshold default of `5`. A unique user-per-organization index enforces the MVP membership rule.

Use a persistent, writable disk for `DATABASE_PATH`. SQLite is intended for a single StockFlow server instance in this MVP. Do not use an ephemeral filesystem or share the SQLite file across horizontally scaled instances. Back up the database using a SQLite-aware backup process.

## Run Commands

```powershell
npm run dev      # Run Express and Vite in development
npm test         # Run API, tenant-isolation, calculation, and migration tests
npm run build    # Build the production frontend into dist/
npm start        # Start Express and serve dist/ when the build exists
```

## API Overview

- `POST /api/auth/signup` with `organizationName`, `email`, and `password`
- `POST /api/auth/login` with `email` and `password`
- `GET /api/auth/me` and `POST /api/auth/logout`
- `GET /api/products?search=`; `POST /api/products`; `PUT /api/products/:id`; `DELETE /api/products/:id`
- `POST /api/products/:id/adjust` with a signed, non-zero integer `delta` and optional `note` (maximum 500 characters)
- `GET /api/dashboard`
- `GET /api/settings` and `PUT /api/settings` with `{ "defaultLowStockThreshold": 5 }`

Protected endpoints return `401` without a valid session. Cross-organization product IDs return `404`. Invalid input returns a JSON error response with an appropriate `4xx` status.

Stock adjustments update quantity and `updated_at`, and record `last_updated_by` plus the optional last adjustment note on the product. They do not create a movement history in this MVP. Adjustments that would take stock below zero are rejected.

## Deployment

Deploy to a Node.js host that supports Node 20+ and persistent local storage:

1. Install dependencies from the repository root with `npm ci`.
2. Build the client from the repository root with `npm run build`; output is written to `frontend/dist/`.
3. Configure `NODE_ENV=production`, the host-provided `PORT`, and an absolute `DATABASE_PATH` on a persistent writable volume.
4. Start the backend from the repository root with `npm start`.
5. Terminate TLS at the host or a trusted reverse proxy and serve the app over HTTPS.
6. Confirm `GET /api/health` reports both API and database status as `ok`.

The Express process serves `frontend/dist/` when present. This repository does not include a platform-specific manifest, container image, managed database, automated backup service, or horizontal-scaling configuration. SQLite storage must persist across deploys; use a server database instead if the target platform has ephemeral disks or requires multiple application instances.

### Deploy on Render with SQLite

Create a Render **Web Service** from this repository. Set **Root Directory** to `.` (the repository root); do not set it to `frontend/`, because the single `package.json` and `package-lock.json` are at the root and there is no separate frontend package manifest. Vite and its React plugin are root `devDependencies`, so the build install must include development dependencies even when `NODE_ENV=production` is configured for the service.

Attach a persistent disk to the web service with this mount path:

```text
/var/data
```

Use these Render commands:

```text
Build Command: npm ci --include=dev && npm run build
Start Command: npm start
```

Add these environment variables in the Render service settings:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_PATH` | `/var/data/stockflow.sqlite` |
| `PORT` | Leave unset; Render provides it. |

The local `.env.example` value `./data/stockflow.sqlite` is relative to the project working directory and is not suitable for persistence on Render. The absolute `/var/data/stockflow.sqlite` path places the database on the attached disk. SQLite also creates `-wal` and `-shm` sidecar files beside the database, so they are on the same persistent disk.

On each start, the backend opens that database, enables WAL and foreign keys, creates any missing tables/indexes, and applies the idempotent column migrations before accepting requests. Redeploys preserve data as long as the disk remains attached at `/var/data` and `DATABASE_PATH` is unchanged. Check `https://<your-service>.onrender.com/api/health` after the first deploy; it should return `{"status":"ok","database":"ok"}`.

Run a single web-service instance for this SQLite setup. Do not scale to multiple instances or use an ephemeral disk; the database file is local to the attached disk and is not a shared database service. Keep the disk attached when deploying new builds, and take backups before destructive database or disk changes.

### Deploy the frontend on Netlify with the Render API

The root `netlify.toml` proxies same-origin `/api/*` requests to `https://stockflow-mvp-1-e3pj.onrender.com`, and sends frontend routes to `index.html` for React Router. In Netlify, set the base directory to the repository root (leave it blank), the build command to `npm ci --include=dev && npm run build`, and the publish directory to `frontend/dist`. Deploy the Render backend first and verify `/api/health`; if its public URL changes, update the API rewrite target in `netlify.toml` before redeploying the frontend.

### Deploy the frontend on Vercel with the Render API

The root `vercel.json` configures the Vite build, publishes `frontend/dist`, rewrites `/api/*` to `https://stockflow-mvp-1-e3pj.onrender.com/api/*`, and sends other paths to the SPA entry point. In Vercel, import the repository with **Root Directory** set to `.` (the repository root). The config installs with `npm ci --include=dev` because Vite is a root development dependency. Deploy the Render backend first and verify `/api/health`; update the rewrite destination in `vercel.json` if the Render URL changes. Vercel hosts only the frontend here; the Express API and SQLite database remain on Render.
