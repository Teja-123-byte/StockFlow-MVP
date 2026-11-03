# StockFlow

StockFlow is a React single-page application with a small Express API and a local SQLite database.

## Requirements

- Node.js 20 or newer
- npm

## Setup

From the project root, install dependencies and create a local environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` only when you need to change the server port or database path. The default database is created automatically at `data/stockflow.sqlite`.

## Development

Run the frontend and backend together:

```powershell
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. Vite proxies `/api` requests to the Express server at `http://localhost:3001`.

Check the backend and database connection at `http://localhost:3001/api/health`. A healthy response is:

```json
{"status":"ok","database":"ok"}
```

## Production build

Build the frontend and start the Express server, which serves the build when present:

```powershell
npm run build
npm start
```

Set `PORT` and `DATABASE_PATH` in the deployment environment. Use persistent storage for the SQLite database file. Do not commit `.env` or database files.

## Authentication API

- `POST /api/auth/signup` accepts `organizationName`, `email`, and `password` and creates the first user in a new organization.
- `POST /api/auth/login` accepts `email` and `password`.
- `GET /api/auth/me` returns the authenticated user and organization, or `401` when the session is missing or invalid.
- `POST /api/auth/logout` revokes the current session.

Passwords are hashed with bcrypt. Session tokens are random, stored only as hashes in SQLite, and sent in HTTP-only, SameSite=Lax cookies. Production cookies require HTTPS.

Product routes require the session cookie and always scope reads and writes to the authenticated user's organization:

- `GET /api/products?search=` lists products and optionally searches by name or SKU.
- `POST /api/products` creates a product.
- `PUT /api/products/:id` updates a product.
- `DELETE /api/products/:id` deletes a product.

SKU values are unique within each organization. Client-supplied organization IDs are ignored. Product integration tests cover CRUD, search, validation, and cross-organization access attempts.

Run the integration tests with:

```powershell
npm test
```
