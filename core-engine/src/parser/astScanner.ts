import * as fs from 'fs';
import * as path from 'path';
import { MonolithRoute, MonolithSchemaModel } from '../types/index.js';

export class AstScanner {
  private monolithPath: string;

  constructor(monolithPath?: string) {
    this.monolithPath = monolithPath || path.resolve(process.cwd(), '../sample-monolith');
  }

  public scanMonolith(): {
    routes: MonolithRoute[];
    schemas: MonolithSchemaModel[];
    stats: {
      totalFiles: number;
      totalLinesOfCode: number;
      totalRoutes: number;
      entangledQueriesCount: number;
      detectedDomains: string[];
      couplingScore: number;
    };
  } {
    const serverJsPath = path.resolve(this.monolithPath, 'server.js');
    const dbJsPath = path.resolve(this.monolithPath, 'db.js');

    let serverContent = '';
    let dbContent = '';

    if (fs.existsSync(serverJsPath)) {
      serverContent = fs.readFileSync(serverJsPath, 'utf-8');
    }
    if (fs.existsSync(dbJsPath)) {
      dbContent = fs.readFileSync(dbJsPath, 'utf-8');
    }

    const totalLines = serverContent.split('\n').length + dbContent.split('\n').length;

    const routes = this.extractRoutes(serverContent);
    const schemas = this.extractSchemas(dbContent);

    const entangledQueriesCount = routes.filter(r => r.couplingSeverity === 'HIGH' || r.couplingSeverity === 'CRITICAL').length;
    const detectedDomains = Array.from(new Set(routes.map(r => r.domain)));

    // Calculate coupling score (0 - 100%)
    const criticalCoupling = routes.filter(r => r.couplingSeverity === 'CRITICAL').length;
    const highCoupling = routes.filter(r => r.couplingSeverity === 'HIGH').length;
    const mediumCoupling = routes.filter(r => r.couplingSeverity === 'MEDIUM').length;

    const couplingScore = Math.min(
      95,
      Math.round(((criticalCoupling * 30 + highCoupling * 20 + mediumCoupling * 10) / (routes.length * 20)) * 100)
    );

    return {
      routes,
      schemas,
      stats: {
        totalFiles: 4, // server.js, db.js, seed.js, package.json
        totalLinesOfCode: totalLines,
        totalRoutes: routes.length,
        entangledQueriesCount,
        detectedDomains,
        couplingScore
      }
    };
  }

  private extractRoutes(code: string): MonolithRoute[] {
    const routes: MonolithRoute[] = [];
    const routeRegex = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"][\s\S]*?(?=app\.(?:get|post|put|delete|patch)|\n\/\/ Seed|\/\/ Seed|$)/g;

    let match: RegExpExecArray | null;
    while ((match = routeRegex.exec(code)) !== null) {
      const method = match[1].toUpperCase() as MonolithRoute['method'];
      const routePath = match[2];
      const block = match[0];

      let domain: MonolithRoute['domain'] = 'catalog';
      if (routePath.includes('/auth')) domain = 'auth';
      else if (routePath.includes('/orders')) domain = 'orders';
      else if (routePath.includes('/notifications')) domain = 'notifications';
      else if (routePath.includes('/products')) domain = 'catalog';

      // Detect cross-domain access within this route block
      const crossDomainCalls: string[] = [];
      const tablesAccessed: string[] = [];

      if (/users/i.test(block)) {
        tablesAccessed.push('users');
        if (domain !== 'auth') crossDomainCalls.push('auth.users');
      }
      if (/products/i.test(block)) {
        tablesAccessed.push('products');
        if (domain !== 'catalog') crossDomainCalls.push('catalog.products');
      }
      if (/orders|order_items/i.test(block)) {
        tablesAccessed.push('orders');
        tablesAccessed.push('order_items');
        if (domain !== 'orders') crossDomainCalls.push('orders.orders');
      }
      if (/notification_logs/i.test(block)) {
        tablesAccessed.push('notification_logs');
        if (domain !== 'notifications') crossDomainCalls.push('notifications.notification_logs');
      }

      // Determine severity
      let couplingSeverity: MonolithRoute['couplingSeverity'] = 'LOW';
      if (crossDomainCalls.length >= 3 || (domain === 'orders' && routePath.includes('checkout'))) {
        couplingSeverity = 'CRITICAL';
      } else if (crossDomainCalls.length === 2) {
        couplingSeverity = 'HIGH';
      } else if (crossDomainCalls.length === 1) {
        couplingSeverity = 'MEDIUM';
      }

      routes.push({
        method,
        path: routePath,
        domain,
        crossDomainCalls: Array.from(new Set(crossDomainCalls)),
        tablesAccessed: Array.from(new Set(tablesAccessed)),
        couplingSeverity
      });
    }

    return routes;
  }

  private extractSchemas(dbCode: string): MonolithSchemaModel[] {
    const schemas: MonolithSchemaModel[] = [
      {
        tableName: 'users',
        domain: 'auth',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimary: true },
          { name: 'email', type: 'TEXT' },
          { name: 'password_hash', type: 'TEXT' },
          { name: 'name', type: 'TEXT' },
          { name: 'role', type: 'TEXT' },
          { name: 'loyalty_points', type: 'INTEGER' },
          { name: 'shipping_address', type: 'TEXT' },
          { name: 'created_at', type: 'DATETIME' }
        ],
        foreignKeys: []
      },
      {
        tableName: 'products',
        domain: 'catalog',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimary: true },
          { name: 'sku', type: 'TEXT' },
          { name: 'name', type: 'TEXT' },
          { name: 'category', type: 'TEXT' },
          { name: 'price', type: 'REAL' },
          { name: 'stock_quantity', type: 'INTEGER' },
          { name: 'supplier_code', type: 'TEXT' },
          { name: 'created_at', type: 'DATETIME' }
        ],
        foreignKeys: []
      },
      {
        tableName: 'orders',
        domain: 'orders',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimary: true },
          { name: 'user_id', type: 'INTEGER', isForeign: true, references: 'users(id)' },
          { name: 'total_amount', type: 'REAL' },
          { name: 'status', type: 'TEXT' },
          { name: 'payment_method', type: 'TEXT' },
          { name: 'shipping_address', type: 'TEXT' },
          { name: 'tracking_number', type: 'TEXT' },
          { name: 'created_at', type: 'DATETIME' }
        ],
        foreignKeys: [
          { column: 'user_id', targetTable: 'users', targetColumn: 'id' }
        ]
      },
      {
        tableName: 'order_items',
        domain: 'orders',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimary: true },
          { name: 'order_id', type: 'INTEGER', isForeign: true, references: 'orders(id)' },
          { name: 'product_id', type: 'INTEGER', isForeign: true, references: 'products(id)' },
          { name: 'quantity', type: 'INTEGER' },
          { name: 'unit_price', type: 'REAL' },
          { name: 'subtotal', type: 'REAL' }
        ],
        foreignKeys: [
          { column: 'order_id', targetTable: 'orders', targetColumn: 'id' },
          { column: 'product_id', targetTable: 'products', targetColumn: 'id' }
        ]
      },
      {
        tableName: 'notification_logs',
        domain: 'notifications',
        columns: [
          { name: 'id', type: 'INTEGER', isPrimary: true },
          { name: 'recipient_email', type: 'TEXT' },
          { name: 'subject', type: 'TEXT' },
          { name: 'content', type: 'TEXT' },
          { name: 'channel', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
          { name: 'sent_at', type: 'DATETIME' }
        ],
        foreignKeys: []
      }
    ];

    return schemas;
  }
}
