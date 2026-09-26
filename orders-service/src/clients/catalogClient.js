'use strict';

/**
 * orders-service/src/clients/catalogClient.js
 *
 * Decoupled HTTP client for the Catalog (Inventory) domain.
 *
 * BEFORE (monolith):
 *   The checkout handler read product price & stock directly from the local DB:
 *     db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, ...)
 *   Then decremented stock inline inside the same ACID transaction:
 *     db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`)
 *
 * AFTER (decoupled):
 *   1. validateAndSnapshot()  — Calls the Catalog REST endpoint to verify each item's
 *      price, availability, and metadata. Returns a snapshot payload that includes
 *      product_name, product_sku, and unit_price — the values the Orders service
 *      will persist in its own database.
 *   2. reserveStock()         — Calls the Catalog service to atomically reserve
 *      (decrement) stock.  This is a separate call so that:
 *        - If the order DB write fails, we can call releaseStock() to undo.
 *        - Stock management stays entirely inside the Catalog bounded context.
 *
 * Resilience:
 *   - Configurable timeout (default 5 s).
 *   - On HTTP errors, throws a typed CatalogError so the caller can return 409/502.
 *   - In test environments (CATALOG_MOCK=true), returns deterministic mock data
 *     without making any network calls, keeping unit tests fast and isolated.
 */

const CATALOG_BASE_URL =
  process.env.CATALOG_SERVICE_URL || 'http://localhost:4000/api/products';
const REQUEST_TIMEOUT_MS = parseInt(process.env.CATALOG_TIMEOUT_MS || '5000', 10);

// ── Typed error ───────────────────────────────────────────────────────────────

class CatalogError extends Error {
  /**
   * @param {string} message
   * @param {'UNAVAILABLE'|'INSUFFICIENT_STOCK'|'PRODUCT_NOT_FOUND'} code
   * @param {number} [httpStatus]
   */
  constructor(message, code, httpStatus) {
    super(message);
    this.name = 'CatalogError';
    this.code = code;
    this.httpStatus = httpStatus || 502;
  }
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Wraps fetch() with an AbortController timeout.
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new CatalogError(
        `Catalog service timed out after ${REQUEST_TIMEOUT_MS}ms`,
        'UNAVAILABLE',
        504
      );
    }
    throw new CatalogError(
      `Catalog service unreachable: ${err.message}`,
      'UNAVAILABLE',
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Mock data for test environments ──────────────────────────────────────────

/**
 * Returns deterministic product data for unit tests.
 * Activated when process.env.CATALOG_MOCK === 'true'.
 * @param {number} productId
 * @returns {{ id: number, name: string, sku: string, price: number, stock_quantity: number }}
 */
function getMockProduct(productId) {
  return {
    id: productId,
    name: `Test Product #${productId}`,
    sku: `TST-SKU-${productId}`,
    price: 199.99,
    stock_quantity: 100,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validates each requested item against the Catalog service and returns a
 * snapshot array containing all data needed by the Orders service.
 *
 * This replaces the monolith's:
 *   db.all(`SELECT * FROM products WHERE id IN (...)`, productIds, ...)
 *
 * @param {Array<{ productId: number, quantity: number }>} items
 * @returns {Promise<Array<{
 *   productId: number,
 *   productName: string,
 *   productSku:  string,
 *   unitPrice:   number,
 *   quantity:    number,
 *   subtotal:    number
 * }>>}
 * @throws {CatalogError}
 */
async function validateAndSnapshot(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('validateAndSnapshot requires a non-empty items array');
  }

  const snapshots = [];

  for (const item of items) {
    let product;

    if (process.env.CATALOG_MOCK === 'true') {
      // ── Test path: no network, deterministic data ─────────────────────
      product = getMockProduct(item.productId);
    } else {
      // ── Production path: call Catalog REST endpoint ───────────────────
      const res = await fetchWithTimeout(
        `${CATALOG_BASE_URL}/${item.productId}`
      );

      if (res.status === 404) {
        throw new CatalogError(
          `Product ID ${item.productId} not found in catalog`,
          'PRODUCT_NOT_FOUND',
          404
        );
      }
      if (!res.ok) {
        throw new CatalogError(
          `Catalog service returned HTTP ${res.status} for product ${item.productId}`,
          'UNAVAILABLE',
          502
        );
      }

      const body = await res.json();
      // The monolith's catalog endpoint wraps the row: { product: { ... } }
      product = body.product || body;
    }

    // Stock guard — mirrors the monolith check but now owned by this call
    if (product.stock_quantity < item.quantity) {
      throw new CatalogError(
        `Insufficient stock for "${product.name}" (SKU: ${product.sku}). ` +
          `Available: ${product.stock_quantity}, requested: ${item.quantity}`,
        'INSUFFICIENT_STOCK',
        409
      );
    }

    const unitPrice = product.price;
    snapshots.push({
      productId:   product.id,
      productName: product.name,   // snapshot — write into order_items
      productSku:  product.sku,    // snapshot — write into order_items
      unitPrice,                   // snapshot — price paid, not current price
      quantity:    item.quantity,
      subtotal:    Math.round(unitPrice * item.quantity * 100) / 100,
    });
  }

  return snapshots;
}

/**
 * Tells the Catalog service to permanently decrement stock for each item.
 * Called AFTER the order row has been committed to the Orders DB.
 *
 * This replaces the monolith's inline:
 *   db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`)
 *
 * Fire-and-forget in the happy path; a failed call is logged but does NOT
 * roll back the committed order — a compensating background process handles
 * eventual consistency (Outbox / saga pattern).
 *
 * @param {Array<{ productId: number, quantity: number }>} items
 * @returns {Promise<void>}
 */
async function reserveStock(items) {
  if (process.env.CATALOG_MOCK === 'true') {
    console.log('[CatalogClient] Mock stock reservation — no network call.');
    return;
  }

  for (const item of items) {
    try {
      const res = await fetchWithTimeout(
        `${CATALOG_BASE_URL}/${item.productId}/stock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decrementBy: item.quantity }),
        }
      );
      if (!res.ok) {
        // Non-fatal: log and continue — a saga/outbox will reconcile
        console.warn(
          `[CatalogClient] Stock reservation for product ${item.productId} returned ` +
            `HTTP ${res.status}. Will reconcile via outbox.`
        );
      }
    } catch (err) {
      // Network error also non-fatal post-commit
      console.warn(
        `[CatalogClient] Stock reservation network error for product ${item.productId}: ` +
          err.message
      );
    }
  }
}

/**
 * Releases (restores) stock when an order is cancelled or the DB write fails
 * BEFORE commit.  Inverse of reserveStock().
 *
 * @param {Array<{ productId: number, quantity: number }>} items
 * @returns {Promise<void>}
 */
async function releaseStock(items) {
  if (process.env.CATALOG_MOCK === 'true') {
    console.log('[CatalogClient] Mock stock release — no network call.');
    return;
  }

  for (const item of items) {
    try {
      const res = await fetchWithTimeout(
        `${CATALOG_BASE_URL}/${item.productId}/stock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incrementBy: item.quantity }),
        }
      );
      if (!res.ok) {
        console.warn(
          `[CatalogClient] Stock release for product ${item.productId} returned HTTP ${res.status}.`
        );
      }
    } catch (err) {
      console.warn(
        `[CatalogClient] Stock release network error for product ${item.productId}: ${err.message}`
      );
    }
  }
}

module.exports = {
  validateAndSnapshot,
  reserveStock,
  releaseStock,
  CatalogError,
};
