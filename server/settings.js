import { Router } from 'express';
import { createAuthMiddleware } from './auth.js';

export function createSettingsRouter(database, options = {}) {
  const router = Router();
  router.use(createAuthMiddleware(database, options));

  router.get('/', (request, response) => {
    const organization = database.prepare(`
      SELECT default_low_stock_threshold AS defaultLowStockThreshold
      FROM organizations
      WHERE id = ?
    `).get(request.user.organizationId);
    if (!organization) return response.status(404).json({ error: 'Organization not found.' });
    return response.json(organization);
  });

  router.put('/', (request, response) => {
    const value = request.body?.defaultLowStockThreshold;
    const threshold = typeof value === 'string' && value.trim() ? Number(value) : value;
    if (!Number.isSafeInteger(threshold) || threshold < 0) {
      return response.status(400).json({
        error: 'Default low-stock threshold must be a non-negative whole number.',
        field: 'defaultLowStockThreshold',
      });
    }

    const result = database.prepare(`
      UPDATE organizations
      SET default_low_stock_threshold = ?
      WHERE id = ?
    `).run(threshold, request.user.organizationId);
    if (!result.changes) return response.status(404).json({ error: 'Organization not found.' });
    return response.json({ defaultLowStockThreshold: threshold });
  });

  return router;
}