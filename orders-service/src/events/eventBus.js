'use strict';

/**
 * orders-service/src/events/eventBus.js
 *
 * Asynchronous Domain Event Bus.
 *
 * BEFORE (monolith):
 *   The checkout handler inserted into `notification_logs` synchronously,
 *   INSIDE the same DB transaction, meaning a mail failure could roll back
 *   the entire order:
 *
 *     db.run(`INSERT INTO notification_logs (...) VALUES (?, ?, ?, 'EMAIL', 'SENT')`, [...]);
 *     db.run('COMMIT', ...);  // notification failure = order rollback!
 *
 * AFTER (decoupled):
 *   After a successful COMMIT, the Orders service emits a domain event.
 *   The Notifications worker listens independently — an order is never
 *   rolled back because an email bounced.
 *
 * Implementation:
 *   Uses Node's built-in EventEmitter for in-process delivery (zero deps).
 *   In production, swap the `_transport` for a real message broker
 *   (RabbitMQ, Kafka, AWS EventBridge) by setting EVENT_TRANSPORT env var.
 *
 * Event catalogue:
 *   ORDER_CREATED  — fired after a new order is committed to the DB
 *   ORDER_CANCELLED — fired when an order status transitions to CANCELLED
 */

const { EventEmitter } = require('events');

// ── Transport registry ────────────────────────────────────────────────────────
// Each transport must implement:  publish(eventName: string, payload: object): void

const transports = {
  /**
   * In-process EventEmitter transport.
   * Used in development and tests.  Subscribers register via eventBus.on().
   */
  memory: class MemoryTransport extends EventEmitter {
    publish(eventName, payload) {
      // setImmediate ensures the emit is truly async (outside the call stack
      // that committed the DB transaction), mirroring real broker behaviour.
      setImmediate(() => {
        this.emit(eventName, payload);
      });
    }
  },
};

// ── Singleton bus ─────────────────────────────────────────────────────────────

const TRANSPORT = process.env.EVENT_TRANSPORT || 'memory';
const TransportClass = transports[TRANSPORT] || transports.memory;
const bus = new TransportClass();

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Publishes a domain event.  Non-blocking — safe to call after DB commit.
 *
 * @param {string} eventName  e.g. 'ORDER_CREATED'
 * @param {object} payload    Domain event payload (serialisable to JSON)
 */
function publish(eventName, payload) {
  console.log(`[EventBus] ▶ Publishing '${eventName}':`, JSON.stringify(payload));
  bus.publish(eventName, { ...payload, _eventName: eventName, _timestamp: new Date().toISOString() });
}

/**
 * Subscribes a handler to a domain event.
 * Returns an unsubscribe function.
 *
 * @param {string}   eventName
 * @param {Function} handler  (payload: object) => void
 * @returns {() => void}
 */
function subscribe(eventName, handler) {
  bus.on(eventName, handler);
  return () => bus.off(eventName, handler);
}

// ── Built-in subscriber: structured console log ───────────────────────────────
// Replace or remove in production; this just makes events visible in dev logs.

subscribe('ORDER_CREATED', (payload) => {
  console.log(
    `[EventBus] ✔ ORDER_CREATED — Order #${payload.orderId} for ` +
      `${payload.customerEmail} | Total: $${payload.totalAmount}`
  );
});

subscribe('ORDER_CANCELLED', (payload) => {
  console.log(`[EventBus] ✔ ORDER_CANCELLED — Order #${payload.orderId}`);
});

// ── Exported domain event names (use these constants, not raw strings) ────────
const EVENTS = Object.freeze({
  ORDER_CREATED:   'ORDER_CREATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
});

module.exports = { publish, subscribe, EVENTS };
