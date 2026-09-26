'use strict';

/**
 * orders-service/src/server.js
 *
 * Thin Express routing layer for the Orders microservice.
 * All business logic lives in services/orderService.js.
 * This file is responsible only for:
 *   - Parsing HTTP input
 *   - Calling the service layer
 *   - Mapping service errors to HTTP status codes
 */

const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { initDatabase } = require('./db');
const orderService     = require('./services/orderService');

const app  = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'legacy_monolith_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[Orders Service] ${req.method} ${req.url}`);
  next();
});

// ── Auth middleware (stateless JWT) ───────────────────────────────────────────
// Decoupled from the monolith's users table — we verify the token signature and
// extract the user context from claims only.  Zero Auth DB queries.
function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Bearer JWT token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
    }
    // Inject full user context from token claims — includes name and email
    // so the service layer can snapshot them without querying a users table.
    req.user = {
      id:    decoded.id,
      name:  decoded.name,
      email: decoded.email,
      role:  decoded.role || 'customer',
    };
    next();
  });
}

// ── Error normaliser ──────────────────────────────────────────────────────────
/**
 * Maps a thrown error to an appropriate HTTP response.
 * Service errors carry a .statusCode property set by the service layer.
 * CatalogErrors carry a .httpStatus property set by the catalog client.
 *
 * @param {Error} err
 * @param {import('express').Response} res
 */
function sendError(err, res) {
  const status = err.statusCode || err.httpStatus || 500;
  console.error(`[Orders Service] Error (${status}):`, err.message);
  res.status(status).json({
    error:     err.message,
    code:      err.code || undefined,
    timestamp: new Date().toISOString(),
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Liveness check — no DB hit required.
 */
app.get('/health', (_req, res) => {
  res.json({
    service:    'orders-service',
    status:     'HEALTHY',
    version:    '1.0.0',
    decoupled:  true,
    transport:  process.env.EVENT_TRANSPORT || 'memory',
    timestamp:  new Date().toISOString(),
  });
});

/**
 * POST /api/v1/orders
 * Create a new order.
 *
 * Body: { items: [{ productId, quantity }], paymentMethod, shippingAddress }
 *
 * 201 — order confirmed
 * 400 — validation error (missing fields)
 * 404 — product not found in Catalog
 * 409 — insufficient stock
 * 502/504 — Catalog service unavailable
 */
app.post('/api/v1/orders', authenticate, async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user, req.body);
    res.status(201).json(order);
  } catch (err) {
    sendError(err, res);
  }
});

/**
 * GET /api/v1/orders
 * List all orders for the authenticated user.
 *
 * Query params: limit (default 20, max 100), offset (default 0)
 *
 * 200 — list of order summaries (read from local DB only, no cross-domain join)
 */
app.get('/api/v1/orders', authenticate, async (req, res) => {
  try {
    const orders = await orderService.getOrdersByUser(req.user.id, {
      limit:  req.query.limit,
      offset: req.query.offset,
    });
    res.json({ orders, total: orders.length });
  } catch (err) {
    sendError(err, res);
  }
});

/**
 * GET /api/v1/orders/:id
 * Get a single order with its line items.
 *
 * 200 — full order with items (all data from local snapshot columns)
 * 404 — order not found or does not belong to the requesting user
 */
app.get('/api/v1/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await orderService.getOrderById(
      parseInt(req.params.id, 10),
      req.user.id
    );
    res.json(order);
  } catch (err) {
    sendError(err, res);
  }
});

/**
 * PATCH /api/v1/orders/:id/status
 * Transition an order through its lifecycle states.
 *
 * Body: { status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | ... }
 *
 * 200 — updated order
 * 400 — invalid status transition
 * 404 — order not found
 */
app.patch('/api/v1/orders/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Request body must include a "status" field.' });
    }
    const updated = await orderService.updateOrderStatus(
      parseInt(req.params.id, 10),
      status
    );
    res.json(updated);
  } catch (err) {
    sendError(err, res);
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────
if (require.main === module) {
  initDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`[Orders Service] Listening on http://localhost:${PORT}`);
      console.log(`[Orders Service] Decoupled from monolith users & products tables.`);
    });
  }).catch((err) => {
    console.error('[Orders Service] DB init failed:', err);
    process.exit(1);
  });
}

module.exports = app;
