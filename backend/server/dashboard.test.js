import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const PASSWORD = 'secure-pass-123';

function createTestApp(t) {
  const database = openDatabase(':memory:');
  t.after(() => database.close());
  return createApp(database, { secureCookies: false, passwordRounds: 4 });
}

async function createUser(app, organizationName, email) {
  const response = await request(app)
    .post('/api/auth/signup')
    .send({ organizationName, email, password: PASSWORD })
    .expect(201);
  return response.headers['set-cookie'][0].split(';')[0];
}

async function addProduct(app, cookie, fields) {
  return request(app)
    .post('/api/products')
    .set('Cookie', cookie)
    .send({ name: 'Item', sku: 'ITEM', ...fields })
    .expect(201);
}

test('dashboard totals and low-stock rows use effective thresholds for only the signed-in organization', async (t) => {
  const app = createTestApp(t);
  const northCookie = await createUser(app, 'North Store', 'north@example.com');
  const southCookie = await createUser(app, 'South Store', 'south@example.com');

  await request(app).put('/api/settings').set('Cookie', northCookie)
    .send({ defaultLowStockThreshold: 4 }).expect(200);
  await request(app).put('/api/settings').set('Cookie', southCookie)
    .send({ defaultLowStockThreshold: 0 }).expect(200);

  await addProduct(app, northCookie, {
    name: 'Normal stock', sku: 'NORMAL', quantity: 10, lowStockThreshold: 2,
  });
  await addProduct(app, northCookie, {
    name: 'At custom threshold', sku: 'CUSTOM', quantity: 4, lowStockThreshold: 4,
  });
  await addProduct(app, northCookie, {
    name: 'Zero stock', sku: 'ZERO', quantity: 0, lowStockThreshold: null,
  });
  await addProduct(app, northCookie, {
    name: 'Default threshold', sku: 'DEFAULT', quantity: 4,
  });
  await addProduct(app, southCookie, {
    name: 'Other organization stock', sku: 'OTHER', quantity: 100,
  });

  const response = await request(app).get('/api/dashboard').set('Cookie', northCookie).expect(200);
  assert.equal(response.body.totalProducts, 4);
  assert.equal(response.body.totalUnits, 18);
  assert.equal(response.body.lowStockCount, 3);
  assert.deepEqual(response.body.lowStock.map(({ sku }) => sku), ['ZERO', 'CUSTOM', 'DEFAULT']);
  assert.deepEqual(response.body.lowStock.map(({ effectiveThreshold }) => effectiveThreshold), [4, 4, 4]);

  const products = await request(app).get('/api/products').set('Cookie', northCookie).expect(200);
  assert.equal(products.body.find(({ sku }) => sku === 'DEFAULT').effectiveThreshold, 4);
});

test('dashboard returns zero totals for empty inventory and requires authentication', async (t) => {
  const app = createTestApp(t);
  const cookie = await createUser(app, 'Empty Store', 'empty@example.com');

  await request(app).get('/api/dashboard').expect(401);
  const response = await request(app).get('/api/dashboard').set('Cookie', cookie).expect(200);
  assert.deepEqual(response.body, {
    totalProducts: 0,
    totalUnits: 0,
    lowStockCount: 0,
    lowStock: [],
  });
});

test('settings default is organization-scoped and validated', async (t) => {
  const app = createTestApp(t);
  const firstCookie = await createUser(app, 'First Store', 'first@example.com');
  const secondCookie = await createUser(app, 'Second Store', 'second@example.com');

  await request(app).get('/api/settings').set('Cookie', firstCookie).expect(200)
    .expect(({ body }) => assert.equal(body.defaultLowStockThreshold, 5));
  await request(app).get('/api/settings').expect(401);
  await request(app).put('/api/settings').send({ defaultLowStockThreshold: 20 }).expect(401);
  await request(app).put('/api/settings').set('Cookie', firstCookie)
    .send({ defaultLowStockThreshold: -1 }).expect(400);
  await request(app).put('/api/settings').set('Cookie', firstCookie)
    .send({ defaultLowStockThreshold: 9, organizationId: 2 }).expect(200);
  await request(app).get('/api/settings').set('Cookie', firstCookie).expect(200)
    .expect(({ body }) => assert.equal(body.defaultLowStockThreshold, 9));
  await request(app).get('/api/settings').set('Cookie', secondCookie).expect(200)
    .expect(({ body }) => assert.equal(body.defaultLowStockThreshold, 5));
});