import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

function createTestApp(t) {
  const database = openDatabase(':memory:');
  t.after(() => database.close());
  return {
    app: createApp(database, { secureCookies: false, passwordRounds: 4 }),
    database,
  };
}

function cookieFrom(response) {
  return response.headers['set-cookie'][0].split(';')[0];
}

test('signup creates an organization, hashed user, and secure session cookie', async (t) => {
  const { app, database } = createTestApp(t);
  const response = await request(app)
    .post('/api/auth/signup')
    .send({ organizationName: 'Northwind Store', email: 'owner@example.com', password: 'secure-pass-123' })
    .expect(201);

  assert.deepEqual(response.body, {
    id: 1,
    email: 'owner@example.com',
    organizationId: 1,
    orgName: 'Northwind Store',
  });
  assert.match(response.headers['set-cookie'][0], /HttpOnly/i);
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/i);

  const stored = database.prepare(`
    SELECT users.email, users.password_hash, users.organization_id, organizations.name
    FROM users JOIN organizations ON organizations.id = users.organization_id
  `).get();
  assert.equal(stored.email, 'owner@example.com');
  assert.equal(stored.name, 'Northwind Store');
  assert.equal(stored.organization_id, response.body.organizationId);
  assert.notEqual(stored.password_hash, 'secure-pass-123');
  assert.match(stored.password_hash, /^\$2[aby]\$/);

  await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookieFrom(response))
    .expect(200, response.body);
});

test('signup rejects invalid fields and duplicate email addresses', async (t) => {
  const { app, database } = createTestApp(t);
  await request(app)
    .post('/api/auth/signup')
    .send({ organizationName: 'A', email: 'not-an-email', password: 'short' })
    .expect(400)
    .expect(({ body }) => assert.equal(body.field, 'email'));

  await request(app)
    .post('/api/auth/signup')
    .send({ organizationName: 'Northwind Store', email: 'owner@example.com', password: 'short' })
    .expect(400)
    .expect(({ body }) => assert.equal(body.field, 'password'));

  await request(app)
    .post('/api/auth/signup')
    .send({ email: 'owner@example.com', password: 'secure-pass-123' })
    .expect(400)
    .expect(({ body }) => assert.equal(body.field, 'organizationName'));

  const payload = {
    organizationName: 'Northwind Store',
    email: 'owner@example.com',
    password: 'secure-pass-123',
  };
  await request(app).post('/api/auth/signup').send(payload).expect(201);
  await request(app)
    .post('/api/auth/signup')
    .send({ ...payload, organizationName: 'Another Store', email: 'OWNER@example.com' })
    .expect(409)
    .expect(({ body }) => assert.match(body.error, /already exists/i));

  assert.equal(database.prepare('SELECT count(*) AS count FROM organizations').get().count, 1);
  assert.equal(database.prepare('SELECT count(*) AS count FROM users').get().count, 1);
});

test('login accepts valid credentials and rejects invalid credentials', async (t) => {
  const { app } = createTestApp(t);
  await request(app)
    .post('/api/auth/signup')
    .send({ organizationName: 'Northwind Store', email: 'owner@example.com', password: 'secure-pass-123' })
    .expect(201);

  await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: 'incorrect-password' })
    .expect(401)
    .expect(({ body }) => assert.equal(body.error, 'Email or password is incorrect.'));

  await request(app)
    .post('/api/auth/login')
    .send({ email: 'OWNER@example.com', password: 'secure-pass-123' })
    .expect(200)
    .expect(({ body }) => assert.equal(body.orgName, 'Northwind Store'));
});

test('protected route requires a valid session and logout revokes it', async (t) => {
  const { app } = createTestApp(t);
  await request(app)
    .get('/api/auth/me')
    .expect(401)
    .expect(({ body }) => assert.equal(body.error, 'Authentication required.'));

  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ organizationName: 'Northwind Store', email: 'owner@example.com', password: 'secure-pass-123' })
    .expect(201);
  const cookie = cookieFrom(signup);

  await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);
  await request(app)
    .get('/api/auth/me')
    .set('Cookie', cookie)
    .expect(401)
    .expect(({ body }) => assert.equal(body.error, 'Session is invalid or expired.'));
});

test('production-configured session cookies include Secure', async (t) => {
  const database = openDatabase(':memory:');
  t.after(() => database.close());
  const app = createApp(database, { secureCookies: true, passwordRounds: 4 });

  const response = await request(app)
    .post('/api/auth/signup')
    .send({ organizationName: 'Secure Store', email: 'secure@example.com', password: 'secure-pass-123' })
    .expect(201);

  assert.match(response.headers['set-cookie'][0], /; Secure/i);
});