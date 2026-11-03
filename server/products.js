import { Router } from 'express';
import { createAuthMiddleware } from './auth.js';

const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER;

function parseProduct(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) {
    return { error: 'Name is required and must be 120 characters or fewer.', field: 'name' };
  }

  const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
  if (!sku || sku.length > 64) {
    return { error: 'SKU is required and must be 64 characters or fewer.', field: 'sku' };
  }

  const description = body.description === undefined ? '' : body.description;
  if (typeof description !== 'string' || description.length > 2000) {
    return { error: 'Description must be 2000 characters or fewer.', field: 'description' };
  }

  const quantity = parseNumericField(body.quantity, 0);
  if (quantity.error) return { error: 'Quantity must be a non-negative whole number.', field: 'quantity' };
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    return { error: 'Quantity must be a non-negative whole number.', field: 'quantity' };
  }

  const costPrice = parseNumericField(body.costPrice, 0);
  if (costPrice.error) return { error: 'Cost price must be a non-negative number.', field: 'costPrice' };
  if (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > MAX_SAFE_NUMBER) {
    return { error: 'Cost price must be a non-negative number.', field: 'costPrice' };
  }

  const sellingPrice = parseNumericField(body.sellingPrice, 0);
  if (sellingPrice.error) return { error: 'Selling price must be a non-negative number.', field: 'sellingPrice' };
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0 || sellingPrice > MAX_SAFE_NUMBER) {
    return { error: 'Selling price must be a non-negative number.', field: 'sellingPrice' };
  }

  let lowStockThreshold = null;
  if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null && body.lowStockThreshold !== '') {
    lowStockThreshold = parseNumericField(body.lowStockThreshold);
    if (lowStockThreshold.error) {
      return { error: 'Low-stock threshold must be a non-negative whole number.', field: 'lowStockThreshold' };
    }
    if (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0) {
      return { error: 'Low-stock threshold must be a non-negative whole number.', field: 'lowStockThreshold' };
    }
  }

  return {
    value: {
      name,
      sku,
      description: description.trim(),
      quantity,
      costPrice,
      sellingPrice,
      lowStockThreshold,
    },
  };
}

function serializeProduct(row) {
  const effectiveThreshold = row.low_stock_threshold ?? row.default_low_stock_threshold ?? 5;
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    quantity: row.quantity,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    lowStockThreshold: row.low_stock_threshold,
    effectiveThreshold,
    isLowStock: row.quantity <= effectiveThreshold,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_PRODUCT = `
  SELECT products.id, products.organization_id, products.name, products.sku,
    products.description, products.quantity, products.cost_price,
    products.selling_price, products.low_stock_threshold, products.created_at,
    products.updated_at, organizations.default_low_stock_threshold
  FROM products JOIN organizations ON organizations.id = products.organization_id
`;

function isSkuConflict(error) {
  return error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY';
}

export function createProductsRouter(database, options = {}) {
  const router = Router();
  router.use(createAuthMiddleware(database, options));

  router.get('/', (request, response) => {
    const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
    if (search.length > 120) {
      return response.status(400).json({ error: 'Search must be 120 characters or fewer.', field: 'search' });
    }

    const rows = search
      ? database.prepare(`${SELECT_PRODUCT}
          WHERE products.organization_id = ? AND (products.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR products.sku LIKE ? ESCAPE '\\' COLLATE NOCASE)
          ORDER BY products.name COLLATE NOCASE, products.id
        `).all(request.user.organizationId, `%${search.replace(/[\\%_]/g, '\\$&')}%`, `%${search.replace(/[\\%_]/g, '\\$&')}%`)
      : database.prepare(`${SELECT_PRODUCT}
          WHERE products.organization_id = ?
          ORDER BY products.name COLLATE NOCASE, products.id
        `).all(request.user.organizationId);
    return response.json(rows.map(serializeProduct));
  });

  router.post('/', (request, response) => {
    const parsed = parseProduct(request.body);
    if (parsed.error) return response.status(400).json({ error: parsed.error, field: parsed.field });

    const now = Date.now();
    const product = parsed.value;
    try {
      const result = database.prepare(`
        INSERT INTO products (
          organization_id, name, sku, description, quantity, cost_price,
          selling_price, low_stock_threshold, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        request.user.organizationId,
        product.name,
        product.sku,
        product.description,
        product.quantity,
        product.costPrice,
        product.sellingPrice,
        product.lowStockThreshold,
        now,
        now,
      );
      const row = database.prepare(`${SELECT_PRODUCT}
        WHERE products.id = ? AND products.organization_id = ?`)
        .get(result.lastInsertRowid, request.user.organizationId);
      return response.status(201).json(serializeProduct(row));
    } catch (error) {
      if (isSkuConflict(error)) return response.status(409).json({ error: 'A product with this SKU already exists in your organization.', field: 'sku' });
      throw error;
    }
  });

  router.put('/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Product ID is invalid.' });

    const parsed = parseProduct(request.body);
    if (parsed.error) return response.status(400).json({ error: parsed.error, field: parsed.field });
    const product = parsed.value;
    const now = Date.now();
    try {
      const result = database.prepare(`
        UPDATE products SET
          name = ?, sku = ?, description = ?, quantity = ?, cost_price = ?,
          selling_price = ?, low_stock_threshold = ?, updated_at = ?
        WHERE id = ? AND organization_id = ?
      `).run(
        product.name,
        product.sku,
        product.description,
        product.quantity,
        product.costPrice,
        product.sellingPrice,
        product.lowStockThreshold,
        now,
        id,
        request.user.organizationId,
      );
      if (!result.changes) return response.status(404).json({ error: 'Product not found.' });
      const row = database.prepare(`${SELECT_PRODUCT}
        WHERE products.id = ? AND products.organization_id = ?`)
        .get(id, request.user.organizationId);
      return response.json(serializeProduct(row));
    } catch (error) {
      if (isSkuConflict(error)) return response.status(409).json({ error: 'A product with this SKU already exists in your organization.', field: 'sku' });
      throw error;
    }
  });

  router.delete('/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Product ID is invalid.' });
    const result = database.prepare('DELETE FROM products WHERE id = ? AND organization_id = ?')
      .run(id, request.user.organizationId);
    if (!result.changes) return response.status(404).json({ error: 'Product not found.' });
    return response.status(204).end();
  });

  return router;
}

function parseNumericField(value, defaultValue) {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (typeof value !== 'number' && typeof value !== 'string') return { error: true };
  if (typeof value === 'string' && !value.trim()) return { error: true };
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : { error: true };
}