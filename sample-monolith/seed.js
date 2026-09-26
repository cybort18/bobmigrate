const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./db');

async function seed() {
  await initDatabase();

  const passwordHash = await bcrypt.hash('password123', 8);

  db.serialize(() => {
    console.log('[Monolith Seed] Seeding initial mock data...');

    // Clear existing tables
    db.run('DELETE FROM notification_logs');
    db.run('DELETE FROM order_items');
    db.run('DELETE FROM orders');
    db.run('DELETE FROM products');
    db.run('DELETE FROM users');

    // 1. Seed Users (Auth Domain)
    const userStmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, loyalty_points, shipping_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    userStmt.run(1, 'alice@example.com', passwordHash, 'Alice Johnson', 'customer', 240, '124 Tech Blvd, Austin, TX');
    userStmt.run(2, 'bob@example.com', passwordHash, 'Bob Smith', 'customer', 80, '456 Innovation Way, Seattle, WA');
    userStmt.run(3, 'admin@bobmarket.com', passwordHash, 'Admin User', 'admin', 1000, 'IBM AI Campus, Armonk, NY');
    userStmt.finalize();

    // 2. Seed Products (Catalog Domain)
    const prodStmt = db.prepare(`
      INSERT INTO products (id, sku, name, category, price, stock_quantity, supplier_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    prodStmt.run(1, 'PROD-SRV-01', 'Cloud Native Server Rack', 'Hardware', 1299.99, 45, 'SUPP-IBM-CLOUD');
    prodStmt.run(2, 'PROD-DEV-02', 'High-Perf Quantum Workstation', 'Workstations', 2499.50, 18, 'SUPP-LENOVO-ENT');
    prodStmt.run(3, 'PROD-ACC-03', 'Mechanical Ergonomic Keyboard', 'Peripherals', 149.00, 120, 'SUPP-LOGI-CORP');
    prodStmt.run(4, 'PROD-NET-04', '10Gbps Managed Fiber Switch', 'Networking', 499.00, 30, 'SUPP-CISCO-SYS');
    prodStmt.finalize();

    // 3. Seed Existing Orders & Items (Orders Domain)
    const orderStmt = db.prepare(`
      INSERT INTO orders (id, user_id, total_amount, status, payment_method, shipping_address, tracking_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    orderStmt.run(101, 1, 1448.99, 'COMPLETED', 'CREDIT_CARD', '124 Tech Blvd, Austin, TX', 'TRK-99201-US');
    orderStmt.run(102, 2, 2499.50, 'PROCESSING', 'PAYPAL', '456 Innovation Way, Seattle, WA', 'TRK-77102-US');
    orderStmt.finalize();

    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    itemStmt.run(101, 1, 1, 1299.99, 1299.99);
    itemStmt.run(101, 3, 1, 149.00, 149.00);
    itemStmt.run(102, 2, 1, 2499.50, 2499.50);
    itemStmt.finalize();

    // 4. Seed Notifications (Notifications Domain)
    const notifStmt = db.prepare(`
      INSERT INTO notification_logs (recipient_email, subject, content, channel, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    notifStmt.run('alice@example.com', 'Order #101 Confirmed', 'Your order of $1448.99 has been confirmed.', 'EMAIL', 'SENT');
    notifStmt.run('bob@example.com', 'Order #102 Processing', 'Your workstation order is currently being provisioned.', 'EMAIL', 'SENT');
    notifStmt.finalize();

    console.log('[Monolith Seed] Database seeded successfully with coupled domain records.');
  });
}

seed().catch(err => {
  console.error('[Monolith Seed] Failed to seed database:', err);
  process.exit(1);
});
