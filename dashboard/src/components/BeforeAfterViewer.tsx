import React, { useState } from 'react';
import { GitCompare, FileCode, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface BeforeAfterViewerProps {
  microserviceFiles: {
    filePath: string;
    description: string;
    code: string;
    language: string;
  }[];
}

export const BeforeAfterViewer: React.FC<BeforeAfterViewerProps> = ({ microserviceFiles }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(1); // default to server.js or orderService.js

  const legacyMonolithSnippet = `// LEGACY MONOLITH (sample-monolith/server.js)
// Anti-Pattern: Tightly coupled checkout handler directly mutating 4 domains
app.post('/api/orders/checkout', authenticateToken, async (req, res) => {
  const { items, paymentMethod } = req.body;

  // 1. DIRECT AUTH QUERY: Reads users table directly
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {

    // 2. DIRECT CATALOG QUERY: Reads & locks products inventory in monolith
    db.all('SELECT * FROM products WHERE id IN (...)', (err, products) => {
      // In-line memory loop verifying catalog stock
      for (const item of items) {
        if (prod.stock_quantity < item.quantity) {
          return res.status(409).json({ error: 'Out of stock' });
        }
      }

      // 3. MONOLITHIC TRANSACTION: 4-table write inside a single blocking call
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        // Insert order
        db.run('INSERT INTO orders (...)');
        // DIRECT CATALOG MUTATION: Decrement products stock directly
        db.run('UPDATE products SET stock_quantity = stock_quantity - ?');
        // DIRECT AUTH MUTATION: Update loyalty points on users table
        db.run('UPDATE users SET loyalty_points = loyalty_points + ?');
        // SYNCHRONOUS BLOCKING NOTIFICATION: Email insert locks request thread
        db.run('INSERT INTO notification_logs (...)');
        db.run('COMMIT');
      });
    });
  });
});`;

  const activeSynthesizedFile = microserviceFiles[selectedFileIdx] || microserviceFiles[0] || {
    filePath: 'src/services/orderService.js',
    code: '// Synthesized microservice code will appear here after decomposition.',
    description: 'Decoupled domain service'
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Before vs. After Architecture Comparison
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monolithic spaghetti code transformed into isolated, production-grade microservice modules
          </p>
        </div>

        {/* Microservice File Selector */}
        {microserviceFiles.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Synthesized File:</span>
            <select
              value={selectedFileIdx}
              onChange={(e) => setSelectedFileIdx(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-blue-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            >
              {microserviceFiles.map((f, i) => (
                <option key={i} value={i}>
                  {f.filePath}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metric Delta Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Cross-DB Joins</div>
          <div className="text-base font-bold text-rose-400 font-mono line-through inline-block mr-1.5">
            4 Joins
          </div>
          <ArrowRight className="w-3.5 h-3.5 inline text-slate-500 mr-1.5" />
          <div className="text-base font-bold text-emerald-400 font-mono inline-block">
            0 Joins
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Inventory Stock Check</div>
          <div className="text-xs font-semibold text-rose-400 line-through inline-block mr-1">
            Direct SQL
          </div>
          <ArrowRight className="w-3 h-3 inline text-slate-500 mr-1" />
          <div className="text-xs font-semibold text-emerald-400 inline-block">
            REST Client
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Notification Handling</div>
          <div className="text-xs font-semibold text-rose-400 line-through inline-block mr-1">
            Sync Lock
          </div>
          <ArrowRight className="w-3 h-3 inline text-slate-500 mr-1" />
          <div className="text-xs font-semibold text-emerald-400 inline-block">
            Async EventBus
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">Deployment Unit</div>
          <div className="text-xs font-semibold text-rose-400 line-through inline-block mr-1">
            Monolith
          </div>
          <ArrowRight className="w-3 h-3 inline text-slate-500 mr-1" />
          <div className="text-xs font-semibold text-emerald-400 inline-block">
            Docker Container
          </div>
        </div>
      </div>

      {/* Code Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Monolith Code */}
        <div className="flex flex-col rounded-xl bg-[#090d16] border border-rose-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-rose-950/40 border-b border-rose-900/40 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-rose-300 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              sample-monolith/server.js (Legacy)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Coupled Anti-Pattern
            </span>
          </div>

          <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[360px] overflow-y-auto">
            <code>{legacyMonolithSnippet}</code>
          </pre>
        </div>

        {/* Right: Synthesized Microservice Code */}
        <div className="flex flex-col rounded-xl bg-[#090d16] border border-emerald-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-950/40 border-b border-emerald-900/40 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              orders-service/{activeSynthesizedFile.filePath}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Synthesized by Bob 2.0
            </span>
          </div>

          <pre className="p-4 text-[11px] font-mono text-emerald-100 overflow-x-auto leading-relaxed max-h-[360px] overflow-y-auto">
            <code>{activeSynthesizedFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
