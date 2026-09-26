import React, { useState } from 'react';
import { Layers, Network, Database, CheckCircle, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react';
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

  // Semantic domain positions for standard microservices
  const baseLayout: Record<string, { x: number; y: number }> = {
    'domain-auth': { x: 150, y: 100 },
    'svc-auth': { x: 150, y: 100 },
    'domain-catalog': { x: 610, y: 100 },
    'svc-catalog': { x: 610, y: 100 },
    'domain-orders': { x: 380, y: 260 },
    'svc-orders': { x: 380, y: 260 },
    'domain-notifications': { x: 380, y: 420 },
    'svc-notifications': { x: 380, y: 420 }
  };

  /**
   * Computes reactive dynamic coordinates for any node list returned from POST /api/analyze
   */
  const getNodeCoordinates = (node: GraphNode, index: number, total: number) => {
    if (baseLayout[node.id]) {
      return baseLayout[node.id];
    }

    // Dynamic radial layout for arbitrary AST discovered nodes
    const angle = (index / Math.max(1, total)) * 2 * Math.PI - Math.PI / 2;
    const rx = 240;
    const ry = 160;
    const centerX = 380;
    const centerY = 260;

    return {
      x: Math.round(centerX + rx * Math.cos(angle)),
      y: Math.round(centerY + ry * Math.sin(angle))
    };
  };

  const dynamicPositions = React.useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    activeNodes.forEach((node, i) => {
      map[node.id] = getNodeCoordinates(node, i, activeNodes.length);
    });
    return map;
  }, [activeNodes]);

  const currentCouplingScore = viewMode === 'monolith' ? (monolithStats?.couplingScore ?? couplingScore) : 0;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-full">
      {/* Header with Switcher & Reactive Coupling Score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              System Architecture Topology
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {activeNodes.length} Nodes • {activeEdges.length} Edges
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AST-scanned domain coupling map vs. synthesized microservice boundaries
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Reactive Coupling Gauge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Coupling:</span>
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
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Decoupled (0%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas & Node Layout */}
      <div className="relative flex-1 min-h-[380px] mt-4 rounded-xl bg-[#090d16]/90 border border-slate-800/80 overflow-hidden flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Topology Status Overlay Tag */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
          {viewMode === 'monolith' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-950/60 border border-rose-800/50 text-rose-300 shadow">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Coupled Monolith AST ({monolithStats?.entangledQueriesCount ?? 5} Entangled Queries, {monolithStats?.totalRoutes ?? 12} Monolith Routes)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 shadow">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zero Coupling (OpenAPI 3.1 REST Contracts & Isolated SQLite Schema)
            </span>
          )}
        </div>

        {/* SVG Drawing Layer for Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 760 520">
          <defs>
            <linearGradient id="grad-coupled" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-decoupled" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {activeEdges.map((edge) => {
            const sourcePos = dynamicPositions[edge.source] || { x: 380, y: 260 };
            const targetPos = dynamicPositions[edge.target] || { x: 380, y: 260 };

            const isCoupled = viewMode === 'monolith';
            const midX = (sourcePos.x + targetPos.x) / 2;
            const midY = (sourcePos.y + targetPos.y) / 2;

            return (
              <g key={edge.id}>
                {/* Connecting Line */}
                <line
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={isCoupled ? 'url(#grad-coupled)' : 'url(#grad-decoupled)'}
                  strokeWidth={isCoupled ? 2.5 : 2}
                  strokeDasharray={isCoupled ? '6 4' : 'none'}
                  className={isCoupled ? 'animate-pulse' : ''}
                />

                {/* Edge Label Badge */}
                <rect
                  x={midX - 110}
                  y={midY - 11}
                  width={220}
                  height={22}
                  rx={6}
                  fill="#0f172a"
                  stroke={isCoupled ? '#ef444455' : '#10b98155'}
                  strokeWidth={1}
                />
                <text
                  x={midX}
                  y={midY + 3.5}
                  textAnchor="middle"
                  fill={isCoupled ? '#fca5a5' : '#6ee7b7'}
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {isCoupled ? '⚡ ' + edge.label.split(':')[0] : '✓ ' + edge.label.split(':')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* DOM HTML Layer for Nodes */}
        <div className="absolute inset-0 pointer-events-auto">
          {activeNodes.map((node) => {
            const pos = dynamicPositions[node.id] || { x: 380, y: 260 };
            const isTarget = node.domain === 'orders';
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                style={{
                  left: `${(pos.x / 760) * 100}%`,
                  top: `${(pos.y / 520) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute cursor-pointer transition-all duration-200 select-none p-3.5 rounded-xl min-w-[170px] max-w-[210px] text-left shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-blue-400 scale-105 z-30'
                    : 'hover:scale-102 hover:shadow-xl z-20'
                } ${
                  isTarget
                    ? viewMode === 'monolith'
                      ? 'bg-rose-950/80 border-2 border-rose-500/80 shadow-rose-900/30'
                      : 'bg-emerald-950/80 border-2 border-emerald-500/80 shadow-emerald-900/30'
                    : 'bg-slate-900/90 border border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {node.domain}
                    </span>
                  </div>
                  {isTarget && (
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                      viewMode === 'monolith' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {viewMode === 'monolith' ? 'HOTSPOT' : 'TARGET'}
                    </span>
                  )}
                </div>

                <div className="font-semibold text-xs text-white leading-tight mb-2">
                  {node.label}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" />
                    {node.routesCount} Routes
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[9px] text-slate-300">
                    <Database className="w-3 h-3 text-slate-500" />
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
          <div className="flex items-center space-x-3 bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-700/70 w-full md:w-auto">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedNode.color }}
            />
            <div>
              <span className="font-semibold text-white">{selectedNode.label}: </span>
              <span className="text-slate-300">
                Bound to tables: <code className="text-blue-300">{selectedNode.tables.join(', ')}</code>
                {' '}| Routes: {selectedNode.routesCount}
                {' '}| Isolation Status: <strong className={selectedNode.status === 'coupled' ? 'text-rose-400' : 'text-emerald-400'}>{selectedNode.status}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-xs flex items-center gap-1.5">
            <span className="text-slate-500">Tip:</span>
            Click any service node above to inspect its boundary parameters and isolated database tables.
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[11px] text-slate-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-500" /> Coupled Monolith Join
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400" /> Decoupled REST Contract
          </span>
        </div>
      </div>
    </div>
  );
};
