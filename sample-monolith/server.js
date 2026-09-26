/**
 * ============================================================================
 * LEGACY ENTERPRISE E-COMMERCE MONOLITH (BobMarket Server)
 * ============================================================================
 * WARNING: This file represents an architectural anti-pattern:
 * - Direct cross-domain database querying (Orders domain joins Auth and Catalog tables)
 * - Distributed state changes inside a single monolithic Express controller
 * - Synchronous notification dispatch embedded in the checkout pipeline
 * - Lack of bounded contexts and lack of independent deployment boundaries
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./db');

const app = express();
const PORT = process.env.MONOLITH_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'legacy_monolith_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// Request logger for monolithic transactions
app.use((req, res, next) => {
  console.log(`[Monolith Core] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Middleware: Monolithic Authentication (Entangled across domains)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing monolithic auth token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ----------------------------------------------------------------------------
// DOMAIN 1: AUTHENTICATION & USER MANAGEMENT
// ----------------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, shipping_address } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const sql = `INSERT INTO users (email, password_hash, name, shipping_address) VALUES (?, ?, ?, ?)`;

    db.run(sql, [email, hashedPassword, name, shipping_address || ''], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'User already exists with this email' });
        }
        return res.status(500).json({ error: err.message });
      }

      const token = jwt.sign({ id: this.lastID, email, name, role: 'customer' }, JWT_SECRET, { expiresIn: '8h' });
      res.status(201).json({
        message: 'User registered successfully',
        userId: this.lastID,
        token
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration', details: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid email or credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        loyalty_points: user.loyalty_points
      }
    });
  });
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, email, name, role, loyalty_points, shipping_address, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });
});

// ----------------------------------------------------------------------------
// DOMAIN 2: CATALOG & INVENTORY
// ----------------------------------------------------------------------------
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM products';
  const params = [];

  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ products: rows, count: rows.length });
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found in catalog' });
    res.json({ product });
  });
});

app.put('/api/products/:id/stock', authenticateToken, (req, res) => {
  const { quantity } = req.body;
  if (typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Quantity must be a valid number' });
  }

  db.run('UPDATE products SET stock_quantity = ? WHERE id = ?', [quantity, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Stock updated', productId: req.params.id, newStock: quantity });
  });
});

// ----------------------------------------------------------------------------
// DOMAIN 3: ORDERS (HEAVILY ENTANGLED WITH AUTH, CATALOG, AND NOTIFICATIONS)
// ----------------------------------------------------------------------------
app.get('/api/orders', authenticateToken, (req, res) => {
  // Direct cross-domain SQL joins: users, orders, order_items, products
  const sql = `
    SELECT 
      o.id AS order_id,
      o.user_id,
      u.name AS customer_name,
      u.email AS customer_email,
      o.total_amount,
      o.status,
      o.payment_method,
      o.shipping_address,
      o.tracking_number,
      o.created_at,
      COUNT(oi.id) AS total_items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    ${req.user.role === 'admin' ? '' : 'WHERE o.user_id = ?'}
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  const params = req.user.role === 'admin' ? [] : [req.user.id];

  db.all(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ orders, total: orders.length });
  });
});

app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;

  // Monolithic join across 4 tables in a single blocking call
  const orderSql = `
    SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.loyalty_points
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;

  db.get(orderSql, [orderId], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Enforce authorization logic in monolithic route
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this order record' });
    }

    const itemsSql = `
      SELECT oi.*, p.sku, p.name AS product_name, p.category, p.supplier_code
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;

    db.all(itemsSql, [orderId], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        order: {
          ...order,
          items
        }
      });
    });
  });
});

/**
 * CHECKOUT ENDPOINT: Tightly coupled domain logic hotspot!
 * - Verifies user credit/address in Auth domain
 * - Directly reads & updates inventory in Catalog domain
 * - Inserts Order & OrderItems in Orders domain
 * - Directly modifies user's loyalty points in Auth domain
 * - Dispatches email notification synchronously in Notifications domain
 */
app.post('/api/orders/checkout', authenticateToken, async (req, res) => {
  const { items, paymentMethod, customShippingAddress } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one product item' });
  }

  // 1. Fetch user data directly from Auth domain table
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Failed to resolve user account for checkout' });
    }

    const shippingAddress = customShippingAddress || user.shipping_address || 'Default Express Address';

    // 2. Validate product stock and prices directly from Catalog domain table
    const productIds = items.map(item => item.productId);
    const placeholders = productIds.map(() => '?').join(',');

    db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
      if (err) return res.status(500).json({ error: 'Catalog lookup failed', details: err.message });

      const productMap = new Map(products.map(p => [p.id, p]));
      let calculatedTotal = 0;
      const orderItemsToInsert = [];

      // Anti-pattern: Synchronous in-memory validation of catalog inventory
      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) {
          return res.status(400).json({ error: `Product with ID ${item.productId} not found in catalog` });
        }
        if (prod.stock_quantity < item.quantity) {
          return res.status(409).json({
            error: `Insufficient inventory for product "${prod.name}" (SKU: ${prod.sku}). Available: ${prod.stock_quantity}, requested: ${item.quantity}`
          });
        }

        const subtotal = prod.price * item.quantity;
        calculatedTotal += subtotal;
        orderItemsToInsert.push({
          productId: prod.id,
          quantity: item.quantity,
          unitPrice: prod.price,
          subtotal
        });
      }

      // 3. Monolithic transaction: write order, decrement catalog stock, credit loyalty points
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const trackingNumber = `TRK-${Math.floor(10000 + Math.random() * 90000)}-BOB`;
        const orderInsertSql = `
          INSERT INTO orders (user_id, total_amount, status, payment_method, shipping_address, tracking_number)
          VALUES (?, ?, 'CONFIRMED', ?, ?, ?)
        `;

        db.run(orderInsertSql, [user.id, calculatedTotal, paymentMethod || 'CREDIT_CARD', shippingAddress, trackingNumber], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Order creation failed', details: err.message });
          }

          const newOrderId = this.lastID;

          // Insert order items
          const itemInsertStmt = db.prepare(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?)
          `);

          // Decrement catalog stock directly (tight coupling!)
          const stockUpdateStmt = db.prepare(`
            UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
          `);

          for (const oi of orderItemsToInsert) {
            itemInsertStmt.run(newOrderId, oi.productId, oi.quantity, oi.unitPrice, oi.subtotal);
            stockUpdateStmt.run(oi.quantity, oi.productId);
          }

          itemInsertStmt.finalize();
          stockUpdateStmt.finalize();

          // Mutate user loyalty points directly in Auth table (tight coupling!)
          const earnedPoints = Math.floor(calculatedTotal * 0.1);
          db.run('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [earnedPoints, user.id]);

          // Synchronously create notification in Notifications table
          const notifContent = `Thank you for your order #${newOrderId}. Total: $${calculatedTotal.toFixed(2)}. Tracking: ${trackingNumber}`;
          db.run(`
            INSERT INTO notification_logs (recipient_email, subject, content, channel, status)
            VALUES (?, ?, ?, 'EMAIL', 'SENT')
          `, [user.email, `Order Confirmation #${newOrderId}`, notifContent]);

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              return res.status(500).json({ error: 'Commit failed', details: commitErr.message });
            }

            console.log(`[Monolith Core] Successfully processed Order #${newOrderId} with tightly coupled cross-domain mutations.`);

            res.status(201).json({
              message: 'Checkout successful via monolithic pipeline',
              order: {
                id: newOrderId,
                userId: user.id,
                totalAmount: calculatedTotal,
                status: 'CONFIRMED',
                trackingNumber,
                shippingAddress,
                earnedLoyaltyPoints: earnedPoints,
                itemsCount: orderItemsToInsert.length
              }
            });
          });
        });
      });
    });
  });
});

// ----------------------------------------------------------------------------
// DOMAIN 4: NOTIFICATIONS
// ----------------------------------------------------------------------------
app.get('/api/notifications/log', authenticateToken, (req, res) => {
  db.all('SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 50', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ notifications: rows, count: rows.length });
  });
});

app.post('/api/notifications/send', authenticateToken, (req, res) => {
  const { recipientEmail, subject, content, channel } = req.body;
  if (!recipientEmail || !subject || !content) {
    return res.status(400).json({ error: 'Missing notification parameters' });
  }

  const sql = `INSERT INTO notification_logs (recipient_email, subject, content, channel, status) VALUES (?, ?, ?, ?, 'SENT')`;
  db.run(sql, [recipientEmail, subject, content, channel || 'EMAIL'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Notification sent and logged', id: this.lastID });
  });
});

// ----------------------------------------------------------------------------
// METADATA & HEALTH CHECK (For BobMigrate scanner)
// ----------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    app: 'BobMarket Legacy Monolith',
    version: '1.0.0',
    database: 'SQLite3 Embedded',
    domainsEntangled: ['auth', 'catalog', 'orders', 'notifications'],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metadata', (req, res) => {
  res.json({
    architecture: 'Tightly Coupled Monolith',
    routes: [
      { path: '/api/auth/register', method: 'POST', domain: 'auth' },
      { path: '/api/auth/login', method: 'POST', domain: 'auth' },
      { path: '/api/auth/profile', method: 'GET', domain: 'auth' },
      { path: '/api/products', method: 'GET', domain: 'catalog' },
      { path: '/api/products/:id', method: 'GET', domain: 'catalog' },
      { path: '/api/products/:id/stock', method: 'PUT', domain: 'catalog' },
      { path: '/api/orders', method: 'GET', domain: 'orders', coupling: ['auth', 'catalog'] },
      { path: '/api/orders/:id', method: 'GET', domain: 'orders', coupling: ['auth', 'catalog'] },
      { path: '/api/orders/checkout', method: 'POST', domain: 'orders', coupling: ['auth', 'catalog', 'notifications'] },
      { path: '/api/notifications/log', method: 'GET', domain: 'notifications' },
      { path: '/api/notifications/send', method: 'POST', domain: 'notifications' }
    ]
  });
});

// Seed & Start Monolith if executed directly
if (require.main === module) {
  initDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`[Monolith Core] BobMarket Monolith listening on port ${PORT}`);
      console.log(`[Monolith Core] Health check available at http://localhost:${PORT}/health`);
    });
  });
}

module.exports = app;
