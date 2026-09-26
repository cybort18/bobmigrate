import { GraphNode, GraphEdge, MonolithRoute, MonolithSchemaModel } from '../types/index.js';

export class GraphBuilder {
  public static buildMonolithGraph(
    routes: MonolithRoute[],
    schemas: MonolithSchemaModel[]
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [
      {
        id: 'domain-auth',
        label: 'Auth & Identity Domain',
        domain: 'auth',
        type: 'bounded_domain',
        routesCount: routes.filter(r => r.domain === 'auth').length,
        tables: ['users'],
        color: '#8a3ffc', // IBM Purple
        status: 'coupled'
      },
      {
        id: 'domain-catalog',
        label: 'Catalog & Inventory Domain',
        domain: 'catalog',
        type: 'bounded_domain',
        routesCount: routes.filter(r => r.domain === 'catalog').length,
        tables: ['products'],
        color: '#0f62fe', // IBM Blue
        status: 'coupled'
      },
      {
        id: 'domain-orders',
        label: 'Orders & Checkout (Target)',
        domain: 'orders',
        type: 'bounded_domain',
        routesCount: routes.filter(r => r.domain === 'orders').length,
        tables: ['orders', 'order_items'],
        color: '#ef4444', // Alert red / critical coupling
        status: 'coupled'
      },
      {
        id: 'domain-notifications',
        label: 'Notification Logs Domain',
        domain: 'notifications',
        type: 'bounded_domain',
        routesCount: routes.filter(r => r.domain === 'notifications').length,
        tables: ['notification_logs'],
        color: '#f59e0b', // Amber
        status: 'coupled'
      }
    ];

    const edges: GraphEdge[] = [
      {
        id: 'edge-orders-auth',
        source: 'domain-orders',
        target: 'domain-auth',
        label: 'Coupled: Direct SQL join on users, user_id FK & loyalty mutation',
        type: 'cross_table_mutation',
        couplingSeverity: 'CRITICAL',
        animated: true
      },
      {
        id: 'edge-orders-catalog',
        source: 'domain-orders',
        target: 'domain-catalog',
        label: 'Coupled: Direct products table query & in-line stock decrement',
        type: 'direct_sql_join',
        couplingSeverity: 'CRITICAL',
        animated: true
      },
      {
        id: 'edge-orders-notifications',
        source: 'domain-orders',
        target: 'domain-notifications',
        label: 'Coupled: Synchronous in-process notification dispatch',
        type: 'sync_in_memory_call',
        couplingSeverity: 'HIGH',
        animated: true
      }
    ];

    return { nodes, edges };
  }

  public static buildDecoupledGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [
      {
        id: 'svc-auth',
        label: 'Auth Microservice',
        domain: 'auth',
        type: 'bounded_domain',
        routesCount: 3,
        tables: ['users_db'],
        color: '#8a3ffc',
        status: 'isolated'
      },
      {
        id: 'svc-catalog',
        label: 'Catalog Microservice',
        domain: 'catalog',
        type: 'bounded_domain',
        routesCount: 3,
        tables: ['catalog_db'],
        color: '#0f62fe',
        status: 'isolated'
      },
      {
        id: 'svc-orders',
        label: 'Orders Synthesized Microservice',
        domain: 'orders',
        type: 'bounded_domain',
        routesCount: 4,
        tables: ['orders_isolated_db'],
        color: '#10b981', // Emerald decoupled
        status: 'decoupled'
      },
      {
        id: 'svc-notifications',
        label: 'Notification Worker',
        domain: 'notifications',
        type: 'bounded_domain',
        routesCount: 2,
        tables: ['notifications_db'],
        color: '#06b6d4',
        status: 'isolated'
      }
    ];

    const edges: GraphEdge[] = [
      {
        id: 'edge-dec-orders-auth',
        source: 'svc-orders',
        target: 'svc-auth',
        label: 'Decoupled: Stateless JWT Token Verification',
        type: 'rest_contract',
        couplingSeverity: 'LOW',
        animated: false
      },
      {
        id: 'edge-dec-orders-catalog',
        source: 'svc-orders',
        target: 'svc-catalog',
        label: 'Decoupled: REST Client /api/v1/products/:id/reserve-stock',
        type: 'rest_contract',
        couplingSeverity: 'LOW',
        animated: false
      },
      {
        id: 'edge-dec-orders-notif',
        source: 'svc-orders',
        target: 'svc-notifications',
        label: 'Decoupled: Async Event Bus (order.placed.v1)',
        type: 'event_bus',
        couplingSeverity: 'LOW',
        animated: true
      }
    ];

    return { nodes, edges };
  }
}
