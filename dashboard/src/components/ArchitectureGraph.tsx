import React, { useState, useMemo } from 'react';
import {
  Layers,
  Network,
  Database,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Gauge,
  Shield,
  Cpu,
  Radio,
  ArrowRight,
  Info
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../types/index.js';

interface ArchitectureGraphProps {
  monolithNodes: GraphNode[];
  monolithEdges: GraphEdge[];
  decoupledNodes: GraphNode[];
  decoupledEdges: GraphEdge[];
  couplingScore?: number;
  monolithStats?: {
    totalFiles?: number;
    totalRoutes?: number;
    entangledQueriesCount?: number;
    couplingScore?: number;
  };
}

export const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({
  monolithNodes,
  monolithEdges,
  decoupledNodes,
  decoupledEdges,
  couplingScore = 38,
  monolithStats
}) => {
  const [viewMode, setViewMode] = useState<'monolith' | 'decoupled'>('monolith');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const activeNodes = viewMode === 'monolith' ? monolithNodes : decoupledNodes;
  const activeEdges = viewMode === 'monolith' ? monolithEdges : decoupledEdges;

  // Viewport dimensions for SVG Canvas (1020 x 520 provides spacious 120px+ clearance)
  const CANVAS_WIDTH = 1020;
  const CANVAS_HEIGHT = 520;

  // Domain position map designed to eliminate all visual collision
  // Left Column (x=180): Auth (y=150), Notifications (y=380)
  // Center Column (x=500): Orders (y=265)
  // Right Column (x=840): Catalog (y=265)
  const baseLayout: Record<string, { x: number; y: number }> = {
    'domain-auth': { x: 180, y: 150 },
    'svc-auth': { x: 180, y: 150 },
    'domain-notifications': { x: 180, y: 380 },
    'svc-notifications': { x: 180, y: 380 },
    'domain-orders': { x: 500, y: 265 },
    'svc-orders': { x: 500, y: 265 },
    'domain-catalog': { x: 840, y: 265 },
    'svc-catalog': { x: 840, y: 265 }
  };

  /**
   * Computes reactive dynamic coordinates for any node list returned from AST scanning.
   * If matched to standard enterprise domain boundaries, uses generous 3-column topology.
   * Otherwise falls back to a collision-free elliptical radial layout.
   */
  const getNodeCoordinates = (node: GraphNode, index: number, total: number) => {
    if (baseLayout[node.id]) {
      return baseLayout[node.id];
    }
    if (node.domain && baseLayout[`domain-${node.domain}`]) {
      return baseLayout[`domain-${node.domain}`];
    }

    // Dynamic elliptical layout for arbitrary dynamic AST nodes with wide radii
    const angle = (index / Math.max(1, total)) * 2 * Math.PI - Math.PI / 2;
    const rx = 340;
    const ry = 175;
    const centerX = 510;
    const centerY = 265;

    return {
      x: Math.round(centerX + rx * Math.cos(angle)),
      y: Math.round(centerY + ry * Math.sin(angle))
    };
  };

  const dynamicPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    activeNodes.forEach((node, i) => {
      map[node.id] = getNodeCoordinates(node, i, activeNodes.length);
    });
    return map;
  }, [activeNodes]);

  const currentCouplingScore = viewMode === 'monolith' ? (monolithStats?.couplingScore ?? couplingScore) : 0;

  /**
   * Generates clean architectural labels without emojis or oversized bounding boxes
   */
  const getConciseEdgeLabel = (edge: GraphEdge, isCoupled: boolean) => {
    const edgeId = edge.id.toLowerCase();
    if (isCoupled) {
      if (edgeId.includes('auth')) return 'Direct SQL: users';
      if (edgeId.includes('catalog')) return 'Shared Query: products';
      if (edgeId.includes('notif')) return 'Blocking Mutex Lock';
      return edge.type.replace(/_/g, ' ');
    } else {
      if (edgeId.includes('auth')) return 'Stateless JWT Auth';
      if (edgeId.includes('catalog')) return 'REST Client (/catalog)';
      if (edgeId.includes('notif')) return 'Async Event (order.v1)';
      return edge.type.replace(/_/g, ' ');
    }
  };

  /**
   * Calculates collision-free connector paths and clearance-verified badge positions
   */
  const getConnectorGeometry = (edge: GraphEdge) => {
    const sourcePos = dynamicPositions[edge.source] || { x: 500, y: 265 };
    const targetPos = dynamicPositions[edge.target] || { x: 180, y: 150 };

    const CARD_HALF_WIDTH = 100;
    const CARD_HALF_HEIGHT = 42;

    const edgeId = edge.id.toLowerCase();

    // 1. Orders -> Catalog (Horizontal Connector across 140px gap)
    if (edgeId.includes('catalog')) {
      const startX = sourcePos.x + CARD_HALF_WIDTH;
      const startY = sourcePos.y;
      const endX = targetPos.x - CARD_HALF_WIDTH;
      const endY = targetPos.y;

      const path = `M ${startX} ${startY} L ${endX} ${endY}`;
      const badgeX = (startX + endX) / 2;
      const badgeY = startY - 18; // Placed above the line to ensure zero collision

      return { path, badgeX, badgeY };
    }

    // 2. Orders -> Auth (Curved Up-Left Connector)
    if (edgeId.includes('auth')) {
      const startX = sourcePos.x - CARD_HALF_WIDTH;
      const startY = sourcePos.y - 20;
      const endX = targetPos.x + CARD_HALF_WIDTH;
      const endY = targetPos.y;

      const ctrlX = (startX + endX) / 2;
      const ctrlY = (startY + endY) / 2 - 10;

      const path = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
      const badgeX = ctrlX;
      const badgeY = ctrlY - 6;

      return { path, badgeX, badgeY };
    }

    // 3. Orders -> Notifications (Curved Down-Left Connector)
    if (edgeId.includes('notif')) {
      const startX = sourcePos.x - CARD_HALF_WIDTH;
      const startY = sourcePos.y + 20;
      const endX = targetPos.x + CARD_HALF_WIDTH;
      const endY = targetPos.y;

      const ctrlX = (startX + endX) / 2;
      const ctrlY = (startY + endY) / 2 + 10;

      const path = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
      const badgeX = ctrlX;
      const badgeY = ctrlY + 6;

      return { path, badgeX, badgeY };
    }

    // Generic fallback connector
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const angle = Math.atan2(dy, dx);

    const startX = sourcePos.x + Math.cos(angle) * CARD_HALF_WIDTH;
    const startY = sourcePos.y + Math.sin(angle) * CARD_HALF_HEIGHT;
    const endX = targetPos.x - Math.cos(angle) * CARD_HALF_WIDTH;
    const endY = targetPos.y - Math.sin(angle) * CARD_HALF_HEIGHT;

    const path = `M ${startX} ${startY} L ${endX} ${endY}`;
    const badgeX = (startX + endX) / 2;
    const badgeY = (startY + endY) / 2;

    return { path, badgeX, badgeY };
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'auth':
        return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      case 'catalog':
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
      case 'orders':
        return <Cpu className="w-3.5 h-3.5 text-emerald-400" />;
      case 'notifications':
        return <Radio className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-full shadow-xl">
      {/* Header with Switcher & Reactive Coupling Score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              System Architecture Topology
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {activeNodes.length} Domains • {activeEdges.length} Connectors
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AST-scanned domain coupling map vs. synthesized microservice boundaries
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Reactive Coupling Gauge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Coupling Score:</span>
            <span className={`font-mono font-bold ${viewMode === 'monolith' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {currentCouplingScore}%
            </span>
          </div>

          {/* View Mode Toggle Pill */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              onClick={() => { setViewMode('monolith'); setSelectedNode(null); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'monolith'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Monolith ({monolithStats?.couplingScore ?? couplingScore}%)</span>
            </button>

            <button
              onClick={() => { setViewMode('decoupled'); setSelectedNode(null); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'decoupled'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Decoupled (0%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas & Node Layout */}
      <div className="relative flex-1 min-h-[440px] mt-4 rounded-xl bg-[#070a12] border border-slate-800/80 overflow-hidden flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Topology Status Overlay Tag */}
        <div className="absolute top-3 left-4 z-10 flex flex-wrap gap-2">
          {viewMode === 'monolith' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-950/70 border border-rose-800/60 text-rose-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Coupled Monolith AST ({monolithStats?.entangledQueriesCount ?? 5} Entangled Queries, {monolithStats?.totalRoutes ?? 12} Monolith Routes)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zero Coupling (OpenAPI 3.1 REST Contracts & Isolated SQLite Schema)
            </span>
          )}
        </div>

        {/* SVG Drawing Layer for Connectors & Badges */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Monolith Gradient */}
            <linearGradient id="grad-coupled" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.85" />
            </linearGradient>

            {/* Decoupled Gradient */}
            <linearGradient id="grad-decoupled" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
            </linearGradient>

            {/* Directional Arrow: Coupled */}
            <marker
              id="arrow-coupled"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
            </marker>

            {/* Directional Arrow: Decoupled */}
            <marker
              id="arrow-decoupled"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>
          </defs>

          {activeEdges.map((edge) => {
            const isCoupled = viewMode === 'monolith';
            const { path, badgeX, badgeY } = getConnectorGeometry(edge);
            const labelText = getConciseEdgeLabel(edge, isCoupled);
            const badgeWidth = Math.max(124, labelText.length * 6.8 + 24);

            return (
              <g key={edge.id}>
                {/* Connecting Line / Curve */}
                <path
                  d={path}
                  fill="none"
                  stroke={isCoupled ? 'url(#grad-coupled)' : 'url(#grad-decoupled)'}
                  strokeWidth={isCoupled ? 2.5 : 2}
                  strokeDasharray={isCoupled ? '6 4' : 'none'}
                  markerEnd={isCoupled ? 'url(#arrow-coupled)' : 'url(#arrow-decoupled)'}
                  className={isCoupled ? 'animate-pulse' : ''}
                />

                {/* Edge Label Badge */}
                <rect
                  x={badgeX - badgeWidth / 2}
                  y={badgeY - 11}
                  width={badgeWidth}
                  height={22}
                  rx={6}
                  fill="#0c1222"
                  stroke={isCoupled ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)'}
                  strokeWidth={1}
                  className="shadow-md"
                />

                {/* Indicator Dot */}
                <circle
                  cx={badgeX - badgeWidth / 2 + 10}
                  cy={badgeY}
                  r={3}
                  fill={isCoupled ? '#f43f5e' : '#10b981'}
                />

                {/* Label Text */}
                <text
                  x={badgeX + 5}
                  y={badgeY + 3.5}
                  textAnchor="middle"
                  fill={isCoupled ? '#fda4af' : '#6ee7b7'}
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </svg>

        {/* DOM HTML Layer for Interactive Nodes */}
        <div className="absolute inset-0 pointer-events-auto">
          {activeNodes.map((node) => {
            const pos = dynamicPositions[node.id] || { x: 500, y: 265 };
            const isTarget = node.domain === 'orders';
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                style={{
                  left: `${(pos.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(pos.y / CANVAS_HEIGHT) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '200px'
                }}
                className={`absolute cursor-pointer transition-all duration-200 select-none p-3 rounded-xl text-left shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-blue-400 scale-105 z-30'
                    : 'hover:scale-[1.02] hover:shadow-xl z-20'
                } ${
                  isTarget
                    ? viewMode === 'monolith'
                      ? 'bg-rose-950/85 border-2 border-rose-500/80 shadow-rose-950/40'
                      : 'bg-emerald-950/85 border-2 border-emerald-500/80 shadow-emerald-950/40'
                    : 'bg-slate-900/90 border border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Node Card Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    {getDomainIcon(node.domain)}
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      {node.domain}
                    </span>
                  </div>
                  {isTarget && (
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded tracking-wide ${
                      viewMode === 'monolith' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {viewMode === 'monolith' ? 'HOTSPOT' : 'TARGET'}
                    </span>
                  )}
                </div>

                {/* Node Service Title */}
                <div className="font-semibold text-xs text-white leading-tight mb-2 truncate">
                  {node.label}
                </div>

                {/* Node Metrics Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" />
                    {node.routesCount} Routes
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[9px] text-slate-300 truncate max-w-[105px]" title={node.tables.join(', ')}>
                    <Database className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    {node.tables.join(', ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Drawer / Quick Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        {selectedNode ? (
          <div className="flex items-center space-x-3 bg-slate-900/70 px-3.5 py-2 rounded-lg border border-slate-700/70 w-full md:w-auto shadow-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedNode.color }}
            />
            <div>
              <span className="font-semibold text-white">{selectedNode.label}: </span>
              <span className="text-slate-300">
                Bound to tables: <code className="text-blue-300 font-mono">{selectedNode.tables.join(', ')}</code>
                {' '}| Routes: {selectedNode.routesCount}
                {' '}| Isolation Status:{' '}
                <strong className={selectedNode.status === 'coupled' ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  {selectedNode.status.toUpperCase()}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Click any service node above to inspect its boundary parameters and isolated database tables.</span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[11px] text-slate-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Coupled Monolith Join
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Decoupled REST Contract
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" /> Async EventBus
          </span>
        </div>
      </div>
    </div>
  );
};
