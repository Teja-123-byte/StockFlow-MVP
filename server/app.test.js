import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

test('returns JSON errors for malformed payloads and unknown API routes', async (t) => {
  const database = openDatabase(':memory:');
  t.after(() => database.close());
  const app = createApp(database, { secureCookies: false });

  await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{invalid-json')
    .expect(400)
    .expect(({ body }) => assert.equal(body.error, 'Request body must be valid JSON.'));

  await request(app)
    .get('/api/not-a-route')
    .expect(404)
    .expect(({ body }) => assert.equal(body.error, 'API route not found'));
});