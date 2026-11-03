import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './db.js';

test('adds the organization default threshold when opening a legacy database', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'stockflow-db-'));
  const path = join(directory, 'legacy.sqlite');
  let database;
  t.after(() => {
    database?.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const legacy = new Database(path);
  legacy.exec(`
    CREATE TABLE organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    INSERT INTO organizations (name, created_at) VALUES ('Legacy Store', 1);
  `);
  legacy.close();

  database = openDatabase(path);
  assert.equal(
    database.prepare('SELECT default_low_stock_threshold FROM organizations WHERE id = 1').get().default_low_stock_threshold,
    5,
  );
  database.close();

  database = openDatabase(path);
  assert.equal(
    database.prepare('SELECT default_low_stock_threshold FROM organizations WHERE id = 1').get().default_low_stock_threshold,
    5,
  );
});

test('allows only one user per organization', (t) => {
  const database = openDatabase(':memory:');
  t.after(() => database.close());

  const organization = database.prepare(
    'INSERT INTO organizations (name, created_at) VALUES (?, ?)'
  ).run('Single User Store', Date.now());
  const addUser = database.prepare(`
    INSERT INTO users (organization_id, email, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `);

  addUser.run(organization.lastInsertRowid, 'owner@example.test', 'hash', Date.now());
  assert.throws(
    () => addUser.run(organization.lastInsertRowid, 'second@example.test', 'hash', Date.now()),
    { code: 'SQLITE_CONSTRAINT_UNIQUE' },
  );
});

test('adds stock adjustment metadata to an existing products table', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'stockflow-products-db-'));
  const path = join(directory, 'legacy-products.sqlite');
  let database;
  t.after(() => {
    database?.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const legacy = new Database(path);
  legacy.exec(`
    CREATE TABLE organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (organization_id, sku)
    );
  `);
  legacy.close();

  database = openDatabase(path);
  const columns = database.prepare('PRAGMA table_info(products)').all().map(({ name }) => name);
  assert.ok(columns.includes('last_updated_by'));
  assert.ok(columns.includes('last_adjustment_note'));
});