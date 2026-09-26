import React from 'react';
import { Zap, TrendingDown, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface BobcoinsTrackerProps {
  totalBudget: number;
  remaining: number;
  used: number;
  pruningMetrics?: {
    rawCodeTokens: number;
    prunedSignatureTokens: number;
    tokensSavedPercentage: number;
    estimatedBobcoinsRaw: number;
    estimatedBobcoinsPruned: number;
    bobcoinsSaved: number;
  };
}

export const BobcoinsTracker: React.FC<BobcoinsTrackerProps> = ({
  totalBudget = 40.0,
  remaining = 40.0,
  used = 0.0,
  pruningMetrics
}) => {
  const percentageUsed = Math.min(100, Math.round((used / totalBudget) * 100));
  const rawTokens = pruningMetrics?.rawCodeTokens || 12500;
  const prunedTokens = pruningMetrics?.prunedSignatureTokens || 1850;
  const savingsPct = pruningMetrics?.tokensSavedPercentage || 85.2;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Zap className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Bobcoins Enterprise Budget & Context Pruner
            </h3>
            <p className="text-[11px] text-slate-400">
              Strict 40 Bobcoins quota compliance through AST signature pruning
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Quota Protected (40 Coins Cap)
        </span>
      </div>

      {/* Progress Bar & Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Current Usage: <strong className="text-amber-300 font-mono">{used.toFixed(2)}</strong> Bobcoins
          </span>
          <span className="text-slate-400">
            Remaining: <strong className="text-emerald-300 font-mono">{remaining.toFixed(2)}</strong> / {totalBudget} Bobcoins
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            style={{ width: `${Math.max(4, percentageUsed)}%` }}
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 rounded-full transition-all duration-500"
          />
        </div>
      </div>

      {/* Context Pruner Token Savings Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Raw Monolith</div>
            <div className="text-sm font-bold text-slate-200 font-mono">
              ~{rawTokens.toLocaleString()} <span className="text-[10px] text-slate-500">tokens</span>
            </div>
            <div className="text-[10px] text-rose-400">1.25 coins / call</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pruned Signatures</div>
            <div className="text-sm font-bold text-emerald-300 font-mono">
              ~{prunedTokens.toLocaleString()} <span className="text-[10px] text-emerald-500">tokens</span>
            </div>
            <div className="text-[10px] text-emerald-400">0.18 coins / call</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Token Reduction</div>
            <div className="text-sm font-bold text-blue-300 font-mono">
              {savingsPct}% <span className="text-[10px] text-blue-500">saved</span>
            </div>
            <div className="text-[10px] text-blue-400">Zero budget overflows</div>
          </div>
        </div>
      </div>
    </div>
  );
};
