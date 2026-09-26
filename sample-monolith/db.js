const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'monolith.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Monolith DB] Connection error:', err.message);
  } else {
    console.log('[Monolith DB] Connected to SQLite database at', dbPath);
  }
});

// Initialize monolithic relational schema with tight domain coupling
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Auth Domain table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'customer',
          loyalty_points INTEGER DEFAULT 0,
          shipping_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Catalog / Inventory Domain table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          price REAL NOT NULL,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          supplier_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Orders Domain tables (Entangled with users and products directly)
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          total_amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          payment_method TEXT NOT NULL,
          shipping_address TEXT NOT NULL,
          tracking_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // 4. Notifications Domain table
      db.run(`
        CREATE TABLE IF NOT EXISTS notification_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipient_email TEXT NOT NULL,
          subject TEXT NOT NULL,
          content TEXT NOT NULL,
          channel TEXT NOT NULL DEFAULT 'EMAIL',
          status TEXT NOT NULL DEFAULT 'SENT',
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('[Monolith DB] Schema init error:', err);
          return reject(err);
        }
        console.log('[Monolith DB] Monolithic schema initialized successfully.');
        resolve();
      });
    });
  });
}

module.exports = {
  db,
  initDatabase
};
