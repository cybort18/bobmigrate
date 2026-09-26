import React from 'react';
import { Cpu, Play, Download, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onAnalyze: () => void;
  onDecompose: () => void;
  onExport: () => void;
  isAnalyzing: boolean;
  isDecomposing: boolean;
  bobcoinsRemaining: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onAnalyze,
  onDecompose,
  onExport,
  isAnalyzing,
  isDecomposing,
  bobcoinsRemaining
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 bg-[#0a0d14]/90 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Bob<span className="text-blue-400 font-extrabold">Migrate</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30">
                IBM Bob 2.0 Agent
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Autonomous Legacy Monolith Decomposer & Microservice Synthesizer
            </p>
          </div>
        </div>

        {/* Status Pills & Actions */}
        <div className="flex items-center space-x-3">
          {/* Bobcoins Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 shadow-inner">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <div className="text-xs">
              <span className="text-slate-400">Budget: </span>
              <span className="font-semibold text-amber-300 font-mono">
                {bobcoinsRemaining.toFixed(2)}
              </span>
              <span className="text-slate-500 font-mono text-[10px]"> / 40 Coins</span>
            </div>
          </div>

          {/* Engine Status */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-medium">Orchestrator Online</span>
          </div>

          {/* Analyze Monolith Button */}
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || isDecomposing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
            title="Scan monolith code and extract AST dependency graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Scan AST</span>
          </button>

          {/* Autonomous Decompose CTA */}
          <button
            onClick={onDecompose}
            disabled={isDecomposing}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isDecomposing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Decomposing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Decompose with Bob 2.0</span>
              </>
            )}
          </button>

          {/* Export Zip CTA */}
          <button
            onClick={onExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
            title="Download synthesized microservice repository"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">Export Repo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
