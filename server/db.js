import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(databasePath) {
  const resolvedPath = databasePath === ':memory:' ? databasePath : resolve(databasePath);
  if (resolvedPath !== ':memory:') mkdirSync(dirname(resolvedPath), { recursive: true });

  const database = new Database(resolvedPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
      default_low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (default_low_stock_threshold >= 0),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
      sku TEXT NOT NULL COLLATE NOCASE CHECK (length(sku) BETWEEN 1 AND 64),
      description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      cost_price REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
      selling_price REAL NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
      low_stock_threshold INTEGER CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (organization_id, sku)
    );

    CREATE INDEX IF NOT EXISTS products_organization_name_idx ON products(organization_id, name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS products_organization_sku_idx ON products(organization_id, sku COLLATE NOCASE);
  `);

  const organizationColumns = database.prepare('PRAGMA table_info(organizations)').all();
  if (!organizationColumns.some((column) => column.name === 'default_low_stock_threshold')) {
    database.exec('ALTER TABLE organizations ADD COLUMN default_low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (default_low_stock_threshold >= 0)');
  }
  return database;
}