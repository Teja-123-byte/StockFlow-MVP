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