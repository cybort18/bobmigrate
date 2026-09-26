import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { ArchitectureGraph } from './components/ArchitectureGraph';
import { AgentTerminal } from './components/AgentTerminal';
import { BeforeAfterViewer } from './components/BeforeAfterViewer';
import { ContractSpecViewer } from './components/ContractSpecViewer';
import { BobcoinsTracker } from './components/BobcoinsTracker';
import { ExportModal } from './components/ExportModal';
import {
  MonolithAnalysisResult,
  DecompositionResult,
  BobAgentReasoningStep
} from './types/index';
import {
  Sparkles,
  Layers,
  Terminal,
  GitCompare,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<MonolithAnalysisResult | null>(null);
  const [decomposition, setDecomposition] = useState<DecompositionResult | null>(null);
  const [steps, setSteps] = useState<BobAgentReasoningStep[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [activeTab, setActiveTab] = useState<'topology' | 'terminal' | 'comparison' | 'contracts'>('topology');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [bobcoinsRemaining, setBobcoinsRemaining] = useState(40.0);

  // Fetch initial analysis and connect to live stream on mount
  useEffect(() => {
    fetchAnalysis();
    fetchArtifacts();

    // Setup SSE connection to Core Engine
    const eventSource = new EventSource('http://localhost:5000/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'STEP_UPDATE' && data.step) {
          setSteps((prev) => {
            const existingIndex = prev.findIndex((s) => s.stepNumber === data.step.stepNumber);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = data.step;
              return updated;
            }
            return [...prev, data.step];
          });
        }
      } catch (err) {
        console.error('SSE Parse error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('http://localhost:5000/api/analyze', { method: 'POST' });
      if (res.ok) {
        const data: MonolithAnalysisResult = await res.json();
        setAnalysis(data);
      }
    } catch (err) {
      console.error('Failed to fetch analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchArtifacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/artifacts');
      if (res.ok) {
        const data: DecompositionResult = await res.json();
        setDecomposition(data);
        setSteps(data.steps || []);
        if (data.bobcoinsBudgetRemaining !== undefined) {
          setBobcoinsRemaining(data.bobcoinsBudgetRemaining);
        }
      }
    } catch (err) {
      console.error('Failed to fetch artifacts:', err);
    }
  };

  const handleDecompose = async () => {
    setIsDecomposing(true);
    setActiveTab('terminal'); // Switch to terminal to view live reasoning
    setSteps([]);

    try {
      const res = await fetch('http://localhost:5000/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDomain: 'orders' })
      });

      if (res.ok) {
        const result: DecompositionResult = await res.json();
        setDecomposition(result);
        setSteps(result.steps);
        setBobcoinsRemaining(result.bobcoinsBudgetRemaining);

        // Celebrate successful autonomous synthesis!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Decomposition error:', err);
    } finally {
      setIsDecomposing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onAnalyze={fetchAnalysis}
        onDecompose={handleDecompose}
        onExport={() => setIsExportOpen(true)}
        isAnalyzing={isAnalyzing}
        isDecomposing={isDecomposing}
        bobcoinsRemaining={bobcoinsRemaining}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Banner / Problem Statement */}
        <div className="relative overflow-hidden rounded-2xl glass-panel p-6 border border-slate-800 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-purple-950/30">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                IBM Bob 2.0 Hackathon Showcase Project
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Autonomous Legacy Monolith Decomposer & Microservice Synthesizer
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Modern enterprise teams spend months manually refactoring tightly-coupled monolithic codebases. 
                <strong> BobMigrate</strong> harnesses <strong>IBM Bob 2.0 Agent Mode</strong> with AST Context Pruning to 
                autonomously identify domain boundaries, synthesize OpenAPI 3.1 contracts, and generate production-grade 
                isolated microservices with tests and Dockerfiles—operating strictly within the 40 Bobcoins quota.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="flex flex-wrap lg:flex-col gap-3 min-w-[200px]">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-md">
                <div className="text-[11px] text-slate-400">Monolith Coupling Score</div>
                <div className="text-xl font-bold text-rose-400 font-mono">
                  {analysis?.monolithStats?.couplingScore ?? 38}% <span className="text-xs text-rose-300 font-normal">Coupled</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-md">
                <div className="text-[11px] text-slate-400">Context Pruning Savings</div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {analysis?.pruningMetrics?.tokensSavedPercentage ?? 85.2}% <span className="text-xs text-emerald-300 font-normal">Tokens Saved</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {[
              { id: 'topology', label: 'Architecture Topology', icon: Layers },
              { id: 'terminal', label: 'Bob Agent Terminal', icon: Terminal, badge: isDecomposing ? 'Live' : undefined },
              { id: 'comparison', label: 'Before vs. After', icon: GitCompare },
              { id: 'contracts', label: 'OpenAPI 3.1 Spec', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500 text-white animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center text-xs text-slate-400 space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            <span>Target Domain: <strong className="text-white font-mono">Orders</strong></span>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="space-y-6">
          {activeTab === 'topology' && (
            <ArchitectureGraph
              monolithNodes={analysis?.graph?.nodes || []}
              monolithEdges={analysis?.graph?.edges || []}
              decoupledNodes={[
                { id: 'svc-auth', label: 'Auth Microservice', domain: 'auth', type: 'bounded_domain', routesCount: 3, tables: ['users_db'], color: '#8a3ffc', status: 'isolated' },
                { id: 'svc-catalog', label: 'Catalog Microservice', domain: 'catalog', type: 'bounded_domain', routesCount: 3, tables: ['catalog_db'], color: '#0f62fe', status: 'isolated' },
                { id: 'svc-orders', label: 'Orders Synthesized Microservice', domain: 'orders', type: 'bounded_domain', routesCount: 4, tables: ['orders_isolated_db'], color: '#10b981', status: 'decoupled' },
                { id: 'svc-notifications', label: 'Notification Worker', domain: 'notifications', type: 'bounded_domain', routesCount: 2, tables: ['notifications_db'], color: '#06b6d4', status: 'isolated' }
              ]}
              decoupledEdges={[
                { id: 'edge-dec-orders-auth', source: 'svc-orders', target: 'svc-auth', label: 'Decoupled: Stateless JWT Token Verification', type: 'rest_contract', couplingSeverity: 'LOW' },
                { id: 'edge-dec-orders-catalog', source: 'svc-orders', target: 'svc-catalog', label: 'Decoupled: REST Client /reserve-stock', type: 'rest_contract', couplingSeverity: 'LOW' },
                { id: 'edge-dec-orders-notif', source: 'svc-orders', target: 'svc-notifications', label: 'Decoupled: Async Event Bus (order.placed.v1)', type: 'event_bus', couplingSeverity: 'LOW', animated: true }
              ]}
            />
          )}

          {activeTab === 'terminal' && (
            <AgentTerminal steps={steps} isDecomposing={isDecomposing} />
          )}

          {activeTab === 'comparison' && (
            <BeforeAfterViewer
              microserviceFiles={decomposition?.artifacts?.microserviceFiles || []}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractSpecViewer
              openApiYaml={decomposition?.artifacts?.openApiYaml || ''}
            />
          )}
        </div>

        {/* Bobcoins Enterprise Budget & Context Pruner Bar */}
        <BobcoinsTracker
          totalBudget={40.0}
          remaining={bobcoinsRemaining}
          used={Math.round((40.0 - bobcoinsRemaining) * 100) / 100}
          pruningMetrics={analysis?.pruningMetrics}
        />
      </main>

      {/* Export Zip Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        files={decomposition?.artifacts?.microserviceFiles || []}
      />

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-900 mt-12 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Built with purpose for the official <strong>IBM Bob 2.0 Hackathon</strong> by lablab.ai
          </div>
          <div className="font-mono text-slate-400">
            Model: <span className="text-blue-400">IBM Granite 3.8B Instruct</span> | Budget Limit: <span className="text-amber-400">40 Bobcoins</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
