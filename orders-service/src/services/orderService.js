'use strict';

/**
 * orders-service/src/services/orderService.js
 *
 * Core business logic for the Orders bounded-context microservice.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * DECOUPLING STRATEGY IMPLEMENTED HERE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * PROBLEM (monolith server.js lines 240-361):
 *   The checkout handler performed 4 cross-domain mutations inside a single
 *   SQLite transaction:
 *     1. SELECT * FROM users         (Auth domain)
 *     2. SELECT * FROM products      (Catalog domain)
 *     3. UPDATE products SET stock_quantity = stock_quantity - ?   (Catalog domain write)
 *     4. UPDATE users SET loyalty_points = loyalty_points + ?      (Auth domain write)
 *     5. INSERT INTO notification_logs ...                          (Notifications domain write)
 *
 * SOLUTION (this file):
 *   ┌─ createOrder() ──────────────────────────────────────────────────────────┐
 *   │  1. User context arrives via JWT claims — zero Auth DB access.           │
 *   │  2. catalogClient.validateAndSnapshot()  — calls Catalog REST API.       │
 *   │     Returns price + name + sku snapshots to persist locally.             │
 *   │  3. catalogClient.reserveStock()         — Catalog service owns decrement│
 *   │  4. Local DB transaction writes ONLY to `orders` + `order_items`.        │
 *   │  5. eventBus.publish('ORDER_CREATED')    — async, post-commit.           │
 *   │     Notification worker subscribes independently; failures never touch   │
 *   │     the order.  Auth service subscribes to award loyalty points.         │
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * Public methods:
 *   createOrder(userContext, orderPayload)  → Promise<Order>
 *   getOrdersByUser(userId, options)        → Promise<OrderSummary[]>
 *   getOrderById(orderId, userId)           → Promise<Order>
 *   updateOrderStatus(orderId, newStatus)   → Promise<Order>
 */

const { db } = require('../db');
const catalogClient = require('../clients/catalogClient');
const { publish, EVENTS } = require('../events/eventBus');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Wraps a db.run() call in a Promise.
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<{ lastID: number, changes: number }>}
 */
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Wraps a db.get() call in a Promise.
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<object|undefined>}
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Wraps a db.all() call in a Promise.
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<object[]>}
 */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Generates a human-readable tracking number.
 * @returns {string}  e.g. "TRK-54812-BOB"
 */
function generateTrackingNumber() {
  return `TRK-${Math.floor(10000 + Math.random() * 90000)}-BOB`;
}

/**
 * Allowed order status transitions.
 * An order may only move forward through the lifecycle; cancellation is
 * allowed from any non-terminal state.
 */
const VALID_TRANSITIONS = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

// ── Service methods ───────────────────────────────────────────────────────────

/**
 * Places a new order.
 *
 * The user context (name, email) comes from the JWT bearer claims that the
 * auth middleware parses — no query is made to a `users` table.
 *
 * @param {{
 *   id:    number,
 *   name:  string,
 *   email: string,
 *   role:  string
 * }} userContext  — parsed JWT claims injected by auth middleware
 *
 * @param {{
 *   items:           Array<{ productId: number, quantity: number }>,
 *   paymentMethod:   string,
 *   shippingAddress: string
 * }} orderPayload
 *
 * @returns {Promise<{
 *   id:             number,
 *   userId:         number,
 *   customerName:   string,
 *   customerEmail:  string,
 *   totalAmount:    number,
 *   status:         string,
 *   trackingNumber: string,
 *   items:          object[],
 *   createdAt:      string
 * }>}
 *
 * @throws {CatalogError}  when a product is not found or is out of stock
 * @throws {Error}         on DB failures
 */
async function createOrder(userContext, orderPayload) {
  const { items, paymentMethod = 'CREDIT_CARD', shippingAddress } = orderPayload;

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Order must contain at least one item.');
    err.statusCode = 400;
    throw err;
  }
  if (!shippingAddress || shippingAddress.trim() === '') {
    const err = new Error('A shipping address is required.');
    err.statusCode = 400;
    throw err;
  }

  // ── Step 1: Validate inventory and collect write-time snapshots ──────────
  // catalogClient.validateAndSnapshot() calls the Catalog REST API for each
  // product.  It:
  //   - Confirms the product exists (throws CatalogError PRODUCT_NOT_FOUND)
  //   - Confirms sufficient stock    (throws CatalogError INSUFFICIENT_STOCK)
  //   - Returns name, sku, and current unit_price to snapshot into order_items
  //
  // This replaces: db.all(`SELECT * FROM products WHERE id IN (...)`, ...)
  const snapshots = await catalogClient.validateAndSnapshot(items);

  const totalAmount = snapshots.reduce((sum, s) => sum + s.subtotal, 0);
  const roundedTotal = Math.round(totalAmount * 100) / 100;
  const trackingNumber = generateTrackingNumber();

  // ── Step 2: Persist order and items in a local-only transaction ──────────
  // This transaction touches ONLY the orders and order_items tables.
  // No reference to `users` or `products` tables — ever.
  await dbRun('BEGIN TRANSACTION');

  let newOrderId;
  try {
    // Insert order row — customer_name and customer_email are JWT-claim snapshots
    const orderResult = await dbRun(
      `INSERT INTO orders
         (user_id, customer_name, customer_email,
          total_amount, status, payment_method, shipping_address, tracking_number)
       VALUES (?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)`,
      [
        userContext.id,
        userContext.name,   // snapshot from JWT claim — no users table join
        userContext.email,  // snapshot from JWT claim — no users table join
        roundedTotal,
        paymentMethod,
        shippingAddress,
        trackingNumber,
      ]
    );

    newOrderId = orderResult.lastID;

    // Insert one order_item row per snapshot
    // product_name, product_sku, unit_price are write-time snapshots from the
    // Catalog API response — no products table join at read time later.
    for (const snapshot of snapshots) {
      await dbRun(
        `INSERT INTO order_items
           (order_id, product_id, product_sku, product_name,
            quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newOrderId,
          snapshot.productId,
          snapshot.productSku,   // snapshot
          snapshot.productName,  // snapshot
          snapshot.quantity,
          snapshot.unitPrice,    // snapshot
          snapshot.subtotal,
        ]
      );
    }

    await dbRun('COMMIT');
  } catch (dbErr) {
    await dbRun('ROLLBACK').catch(() => {}); // best-effort rollback

    // If the DB write failed after validateAndSnapshot but before reserveStock,
    // stock has not yet been decremented — nothing to release.
    throw dbErr;
  }

  // ── Step 3: Delegate stock decrement to Catalog service ──────────────────
  // This call happens AFTER our commit so that a Catalog network hiccup never
  // rolls back a committed order.  If it fails, a reconciliation job handles it.
  //
  // This replaces: db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ?...`)
  await catalogClient.reserveStock(
    snapshots.map((s) => ({ productId: s.productId, quantity: s.quantity }))
  );

  // ── Step 4: Publish async domain event ───────────────────────────────────
  // The Notifications service subscribes to ORDER_CREATED independently.
  // The Auth service subscribes to award loyalty points.
  // Neither subscription is in our call stack — a notification failure
  // cannot touch this committed order.
  //
  // This replaces:
  //   db.run(`INSERT INTO notification_logs ...`)  // synchronous, in-transaction
  //   db.run(`UPDATE users SET loyalty_points = loyalty_points + ?...`)
  publish(EVENTS.ORDER_CREATED, {
    orderId:       newOrderId,
    userId:        userContext.id,
    customerName:  userContext.name,
    customerEmail: userContext.email,
    totalAmount:   roundedTotal,
    trackingNumber,
    itemCount:     snapshots.length,
  });

  // Return the confirmed order with items
  return {
    id:             newOrderId,
    userId:         userContext.id,
    customerName:   userContext.name,
    customerEmail:  userContext.email,
    totalAmount:    roundedTotal,
    status:         'CONFIRMED',
    paymentMethod,
    shippingAddress,
    trackingNumber,
    items:          snapshots,
    createdAt:      new Date().toISOString(),
  };
}

/**
 * Retrieves a paginated list of orders for a given user.
 * Reads entirely from the local `orders` table — no cross-domain join required.
 *
 * This replaces:
 *   SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id
 *
 * @param {number} userId
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<object[]>}
 */
async function getOrdersByUser(userId, options = {}) {
  const limit  = Math.min(parseInt(options.limit  ?? 20, 10), 100);
  const offset = Math.max(parseInt(options.offset ?? 0,  10), 0);

  // customer_name and customer_email come from the local snapshot columns —
  // no JOIN to any external table needed.
  const orders = await dbAll(
    `SELECT id, user_id, customer_name, customer_email,
            total_amount, status, payment_method,
            shipping_address, tracking_number, created_at
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return orders;
}

/**
 * Retrieves a single order with its line items.
 * All data is sourced from the local isolated database — no JOIN to
 * `users` or `products` because names/prices were snapshotted at write time.
 *
 * This replaces:
 *   SELECT o.*, u.name, u.email, u.loyalty_points FROM orders o JOIN users u...
 *   SELECT oi.*, p.sku, p.name, p.category FROM order_items oi JOIN products p...
 *
 * @param {number} orderId
 * @param {number} userId   — used to enforce row-level authorization
 * @returns {Promise<object>}
 * @throws {Error} with statusCode 404 if not found / not owned by userId
 */
async function getOrderById(orderId, userId) {
  // customer_name / customer_email served from snapshot — no users join
  const order = await dbGet(
    `SELECT id, user_id, customer_name, customer_email,
            total_amount, status, payment_method,
            shipping_address, tracking_number, created_at, updated_at
     FROM orders
     WHERE id = ? AND user_id = ?`,
    [orderId, userId]
  );

  if (!order) {
    const err = new Error(`Order ${orderId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  // product_name / product_sku / unit_price served from snapshot — no products join
  const items = await dbAll(
    `SELECT id, product_id, product_sku, product_name,
            quantity, unit_price, subtotal
     FROM order_items
     WHERE order_id = ?`,
    [orderId]
  );

  return { ...order, items };
}

/**
 * Transitions an order to a new status, enforcing the allowed lifecycle graph.
 *
 * @param {number} orderId
 * @param {string} newStatus
 * @returns {Promise<object>}  updated order (without items for brevity)
 * @throws {Error} with statusCode 400 for invalid transitions, 404 if not found
 */
async function updateOrderStatus(orderId, newStatus) {
  const order = await dbGet(
    'SELECT id, status FROM orders WHERE id = ?',
    [orderId]
  );

  if (!order) {
    const err = new Error(`Order ${orderId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Cannot transition order from '${order.status}' to '${newStatus}'. ` +
        `Allowed next states: [${allowed.join(', ') || 'none'}].`
    );
    err.statusCode = 400;
    throw err;
  }

  await dbRun(
    `UPDATE orders
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [newStatus, orderId]
  );

  if (newStatus === 'CANCELLED') {
    publish(EVENTS.ORDER_CANCELLED, { orderId, previousStatus: order.status });
  }

  return dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
}

module.exports = {
  createOrder,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
};
