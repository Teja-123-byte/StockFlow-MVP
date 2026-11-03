import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const PASSWORD = 'secure-pass-123';

function createTestApp(t) {
  const database = openDatabase(':memory:');
  t.after(() => database.close());
  return {
    app: createApp(database, { secureCookies: false, passwordRounds: 4 }),
    database,
  };
}

async function createOrganizationUser(app, organizationName, email) {
  const response = await request(app)
    .post('/api/auth/signup')
    .send({ organizationName, email, password: PASSWORD })
    .expect(201);
  return { cookie: response.headers['set-cookie'][0].split(';')[0], user: response.body };
}

const productPayload = {
  name: 'Green Tea',
  sku: 'TEA-001',
  description: 'Loose leaf tea',
  quantity: 12,
  costPrice: 3.25,
  sellingPrice: 7.5,
  lowStockThreshold: 4,
};

test('creates, lists, searches, edits, and deletes products', async (t) => {
  const { app, database } = createTestApp(t);
  const { cookie, user } = await createOrganizationUser(app, 'Tea Shop', 'tea@example.com');

  const created = await request(app)
    .post('/api/products')
    .set('Cookie', cookie)
    .send({ ...productPayload, organizationId: 987654 })
    .expect(201);
  assert.equal(created.body.name, productPayload.name);
  assert.equal(created.body.sku, productPayload.sku);
  assert.equal(created.body.organizationId, user.organizationId);
  assert.equal(created.body.isLowStock, false);
  assert.equal(database.prepare('SELECT organization_id FROM products WHERE id = ?').get(created.body.id).organization_id, user.organizationId);

  const listed = await request(app).get('/api/products').set('Cookie', cookie).expect(200);
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].id, created.body.id);

  await request(app).get('/api/products?search=green').set('Cookie', cookie).expect(200)
    .expect(({ body }) => assert.equal(body.length, 1));
  await request(app).get('/api/products?search=tea-001').set('Cookie', cookie).expect(200)
    .expect(({ body }) => assert.equal(body.length, 1));
  await request(app).get('/api/products?search=missing').set('Cookie', cookie).expect(200)
    .expect(({ body }) => assert.equal(body.length, 0));

  const updated = await request(app)
    .put(`/api/products/${created.body.id}`)
    .set('Cookie', cookie)
    .send({ ...productPayload, name: 'Sencha Tea', quantity: 3 })
    .expect(200);
  assert.equal(updated.body.name, 'Sencha Tea');
  assert.equal(updated.body.quantity, 3);
  assert.equal(updated.body.isLowStock, true);
  assert.equal(updated.body.effectiveThreshold, 4);

  await request(app)
    .delete(`/api/products/${created.body.id}`)
    .set('Cookie', cookie)
    .expect(204);
  await request(app).get('/api/products').set('Cookie', cookie).expect(200)
    .expect(({ body }) => assert.equal(body.length, 0));
});

test('validates product fields and enforces organization-scoped unique SKUs', async (t) => {
  const { app } = createTestApp(t);
  const first = await createOrganizationUser(app, 'Tea Shop', 'tea@example.com');
  const second = await createOrganizationUser(app, 'Coffee Shop', 'coffee@example.com');

  await request(app).post('/api/products').set('Cookie', first.cookie)
    .send({ ...productPayload, quantity: -2 }).expect(400)
    .expect(({ body }) => assert.equal(body.field, 'quantity'));
  await request(app).post('/api/products').set('Cookie', first.cookie)
    .send({ ...productPayload, costPrice: 'not-money' }).expect(400)
    .expect(({ body }) => assert.equal(body.field, 'costPrice'));
  await request(app).post('/api/products').set('Cookie', first.cookie)
    .send({ ...productPayload, quantity: true }).expect(400)
    .expect(({ body }) => assert.equal(body.field, 'quantity'));
  await request(app).post('/api/products').set('Cookie', first.cookie)
    .send({ ...productPayload, sellingPrice: '' }).expect(400)
    .expect(({ body }) => assert.equal(body.field, 'sellingPrice'));

  await request(app).post('/api/products').set('Cookie', first.cookie).send(productPayload).expect(201);
  await request(app).post('/api/products').set('Cookie', first.cookie)
    .send({ ...productPayload, sku: 'tea-001' }).expect(409);
  await request(app).post('/api/products').set('Cookie', second.cookie).send(productPayload).expect(201);
});

test('requires authentication and prevents cross-organization product access', async (t) => {
  const { app } = createTestApp(t);
  const first = await createOrganizationUser(app, 'Tea Shop', 'tea@example.com');
  const second = await createOrganizationUser(app, 'Coffee Shop', 'coffee@example.com');
  const created = await request(app).post('/api/products').set('Cookie', first.cookie)
    .send(productPayload).expect(201);

  await request(app).get('/api/products').expect(401);
  await request(app).post('/api/products').send(productPayload).expect(401);

  await request(app).get('/api/products').set('Cookie', second.cookie).expect(200)
    .expect(({ body }) => assert.deepEqual(body, []));
  await request(app).put(`/api/products/${created.body.id}`).set('Cookie', second.cookie)
    .send({ ...productPayload, name: 'Hijacked' }).expect(404);
  await request(app).delete(`/api/products/${created.body.id}`).set('Cookie', second.cookie).expect(404);

  await request(app).get('/api/products').set('Cookie', first.cookie).expect(200)
    .expect(({ body }) => assert.equal(body[0].name, productPayload.name));
});