'use strict';

/**
 * orders-service/src/db.js
 *
 * Isolated SQLite database for the Orders microservice.
 *
 * DECOUPLING STRATEGY — Write-Time Snapshot Pattern:
 *   The monolith joined `users` and `products` at query-time to fetch names/emails.
 *   We instead snapshot those values at the moment the order is placed:
 *     - orders.customer_name      (was: JOIN users u ON o.user_id = u.id)
 *     - orders.customer_email     (was: JOIN users u ON o.user_id = u.id)
 *     - order_items.product_name  (was: JOIN products p ON oi.product_id = p.id)
 *     - order_items.product_sku   (was: JOIN products p ON oi.product_id = p.id)
 *
 *   This database contains ZERO foreign keys pointing outside this service.
 *   The only FK retained is the intra-domain order_items → orders relationship.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../orders_isolated.db');

/**
 * Creates and returns the SQLite database handle.
 * Uses ':memory:' automatically when DB_PATH is set to ':memory:' in tests.
 */
function createDb() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('[Orders DB] Failed to open database:', err.message);
    }
  });
}

const db = createDb();

/**
 * Initialises the isolated schema. Safe to call multiple times (IF NOT EXISTS).
 * Returns a Promise so callers can await before accepting traffic.
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL;');
      db.run('PRAGMA foreign_keys = ON;');

      // ── Orders table ──────────────────────────────────────────────────────
      // customer_name / customer_email are write-time snapshots from the Auth
      // domain — captured at checkout, never re-fetched via cross-domain join.
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER  NOT NULL,
          customer_name    TEXT     NOT NULL,
          customer_email   TEXT     NOT NULL,
          total_amount     REAL     NOT NULL CHECK(total_amount >= 0),
          status           TEXT     NOT NULL DEFAULT 'PENDING'
                           CHECK(status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
          payment_method   TEXT     NOT NULL,
          shipping_address TEXT     NOT NULL,
          tracking_number  TEXT     NOT NULL,
          created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ── Order items table ─────────────────────────────────────────────────
      // product_name / product_sku are write-time snapshots from the Catalog
      // domain — captured via the CatalogClient REST contract at checkout time.
      // unit_price is also snapshotted so historical orders show the price paid,
      // even if the Catalog service later changes the product's current price.
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id   INTEGER NOT NULL,
          product_sku  TEXT    NOT NULL,
          product_name TEXT    NOT NULL,
          quantity     INTEGER NOT NULL CHECK(quantity > 0),
          unit_price   REAL    NOT NULL CHECK(unit_price >= 0),
          subtotal     REAL    NOT NULL CHECK(subtotal >= 0)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('[Orders DB] Isolated schema ready (no cross-domain FK).');
          resolve();
        }
      });
    });
  });
}

module.exports = { db, initDatabase };
