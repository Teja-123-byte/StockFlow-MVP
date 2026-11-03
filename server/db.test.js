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