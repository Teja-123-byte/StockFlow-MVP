import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthRouter } from './auth.js';
import { createProductsRouter } from './products.js';
import { createDashboardRouter } from './dashboard.js';
import { createSettingsRouter } from './settings.js';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(serverDirectory, '..');

export function createApp(database, options = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_request, response) => {
    try {
      database.prepare('SELECT 1').get();
      response.json({ status: 'ok', database: 'ok' });
    } catch {
      response.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  app.use('/api/auth', createAuthRouter(database, options));
  app.use('/api/dashboard', createDashboardRouter(database, options));
  app.use('/api/products', createProductsRouter(database, options));
  app.use('/api/settings', createSettingsRouter(database, options));
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'API route not found' });
  });

  const clientBuildDirectory = resolve(projectDirectory, 'dist');
  if (existsSync(clientBuildDirectory)) {
    app.use(express.static(clientBuildDirectory));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api')) return next();
      response.sendFile(resolve(clientBuildDirectory, 'index.html'));
    });
  }

  app.use((_request, response) => {
    response.status(404).send('Not found');
  });

  app.use((error, _request, response, _next) => {
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    if (error.type === 'entity.too.large') {
      return response.status(413).json({ error: 'Request body is too large.' });
    }
    console.error(error);
    return response.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return app;
}