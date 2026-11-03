import { Router } from 'express';
import { createAuthMiddleware } from './auth.js';

export function createDashboardRouter(database, options = {}) {
  const router = Router();
  router.use(createAuthMiddleware(database, options));

  router.get('/', (request, response) => {
    const organizationId = request.user.organizationId;
    const organization = database.prepare(`
      SELECT default_low_stock_threshold
      FROM organizations
      WHERE id = ?
    `).get(organizationId);
    if (!organization) return response.status(404).json({ error: 'Organization not found.' });

    const totals = database.prepare(`
      SELECT COUNT(*) AS totalProducts, COALESCE(SUM(quantity), 0) AS totalUnits
      FROM products
      WHERE organization_id = ?
    `).get(organizationId);
    const lowStock = database.prepare(`
      SELECT id, name, sku, quantity,
        COALESCE(low_stock_threshold, ?) AS effectiveThreshold
      FROM products
      WHERE organization_id = ?
        AND quantity <= COALESCE(low_stock_threshold, ?)
      ORDER BY quantity ASC, name COLLATE NOCASE ASC, id ASC
    `).all(
      organization.default_low_stock_threshold,
      organizationId,
      organization.default_low_stock_threshold,
    );

    return response.json({
      totalProducts: totals.totalProducts,
      totalUnits: totals.totalUnits,
      lowStockCount: lowStock.length,
      lowStock,
    });
  });

  return router;
}