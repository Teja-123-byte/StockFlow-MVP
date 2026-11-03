# StockFlow

StockFlow is a small, multi-tenant inventory management MVP. Organizations can manage a product catalog, monitor stock levels, and configure a default low-stock threshold. The React client and Express API are served from one origin in production; SQLite stores application data.

## Features

- Email/password signup and login with bcrypt password hashing.
- Random, expiring server-side sessions sent as HTTP-only, SameSite=Lax cookies.
- Organization-scoped product creation, listing, search, editing, and deletion.
- Case-insensitive SKU uniqueness within each organization.
- Inventory dashboard totals and low-stock list using `quantity <= effective threshold`.
- Organization default low-stock settings, used when a product has no custom threshold.
- Responsive Dashboard, Products, and Settings views with loading, empty, validation, and error states.

All product, dashboard, and settings queries derive organization scope from the authenticated session. A client-supplied organization ID is not used to select tenant data.

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

The server creates the database directory and tables on startup. It enables SQLite foreign keys and WAL mode. Existing databases are checked for the organization default-threshold column and upgraded in place when it is missing; the migration is idempotent and existing organizations receive a default of `5`.

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
- `GET /api/dashboard`
- `GET /api/settings` and `PUT /api/settings` with `{ "defaultLowStockThreshold": 5 }`

Protected endpoints return `401` without a valid session. Cross-organization product IDs return `404`. Invalid input returns a JSON error response with an appropriate `4xx` status.

## Deployment

Deploy to a Node.js host that supports Node 20+ and persistent local storage:

1. Install dependencies with `npm ci`.
2. Build the client with `npm run build`.
3. Configure `NODE_ENV=production`, the host-provided `PORT`, and an absolute `DATABASE_PATH` on a persistent writable volume.
4. Start the server with `npm start`.
5. Terminate TLS at the host or a trusted reverse proxy and serve the app over HTTPS.
6. Confirm `GET /api/health` reports both API and database status as `ok`.

The Express process serves the `dist/` build when present. This repository does not include a platform-specific manifest, container image, managed database, automated backup service, or horizontal-scaling configuration. SQLite storage must persist across deploys; use a server database instead if the target platform has ephemeral disks or requires multiple application instances.
