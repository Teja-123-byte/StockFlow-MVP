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

## Current scope

This foundation includes frontend tooling, backend startup, SQLite connection setup, environment configuration, and a health endpoint. Authentication, product APIs, database tables, and organization isolation are not implemented yet.