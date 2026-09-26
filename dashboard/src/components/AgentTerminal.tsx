import React, { useRef, useEffect } from 'react';
import { Terminal, CheckCircle2, Clock, AlertCircle, FileCode2, Copy, Check, Sparkles, Cpu } from 'lucide-react';
import { BobAgentReasoningStep } from '../types/index.js';

interface AgentTerminalProps {
  steps: BobAgentReasoningStep[];
  isDecomposing: boolean;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ steps, isDecomposing }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const handleCopyLogs = () => {
    const fullLog = steps
      .map(
        (s) =>
          `[STEP ${s.stepNumber}: ${s.stepName}] - ${s.status.toUpperCase()}\nTitle: ${s.title}\nDetails: ${s.details}\nThought Process:\n${s.thoughtProcess}\nArtifacts: ${s.artifactsProduced?.join(', ') || 'None'}\n----------------------------------------`
      )
      .join('\n\n');

    navigator.clipboard.writeText(fullLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5 ml-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            bob-agent@ibm-2.0:~# stream
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isDecomposing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
              <Sparkles className="w-3 h-3 animate-spin text-blue-400" />
              Agent Mode Reasoning...
            </span>
          )}

          <button
            onClick={handleCopyLogs}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
            title="Copy terminal logs to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Steps Pipeline Visual Progression */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-b border-slate-800/80">
        {[
          { num: 1, name: 'Boundary Analysis', desc: 'AST & Schema Pruning' },
          { num: 2, name: 'Contract Synthesis', desc: 'OpenAPI 3.1 Specs' },
          { num: 3, name: 'Service Synthesizer', desc: 'Express, Tests & Docker' }
        ].map((pipelineStep) => {
          const matchingStep = steps.find((s) => s.stepNumber === pipelineStep.num);
          const isDone = matchingStep?.status === 'completed';
          const isInProgress = matchingStep?.status === 'in_progress';

          return (
            <div
              key={pipelineStep.num}
              className={`p-2 rounded-lg border transition-all text-xs ${
                isDone
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                  : isInProgress
                  ? 'bg-blue-950/40 border-blue-600/60 text-blue-200 animate-pulse'
                  : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between font-semibold mb-0.5">
                <span className="flex items-center gap-1.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isInProgress ? (
                    <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  Step {pipelineStep.num}: {pipelineStep.name}
                </span>
                {isDone && <span className="text-[10px] font-mono text-emerald-400">DONE</span>}
              </div>
              <p className="text-[10px] text-slate-400 pl-5">{pipelineStep.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Terminal Live Output Stream */}
      <div className="flex-1 mt-3 p-4 rounded-xl bg-[#06080e] border border-slate-900 font-mono text-xs overflow-y-auto max-h-[320px] space-y-4">
        {steps.length === 0 ? (
          <div className="text-slate-500 flex flex-col items-center justify-center py-12 space-y-2">
            <Terminal className="w-8 h-8 text-slate-700" />
            <p>Ready to decompose. Click "Decompose with Bob 2.0" above to initiate the pipeline.</p>
            <p className="text-[11px] text-slate-600">
              Live reasoning tokens and AST boundary decisions will stream here in real time.
            </p>
          </div>
        ) : (
          steps.map((step, idx) => (
            <div key={idx} className="space-y-1.5 pb-2 border-b border-slate-900/80 last:border-none">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="text-blue-400 font-bold">
                  [Step {step.stepNumber}] {step.title}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{step.timestamp.split('T')[1]?.slice(0, 8)}</span>
              </div>

              <p className="text-slate-300 text-xs pl-2 border-l border-blue-500/40">
                {step.details}
              </p>

              {/* Thought Process Block */}
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                <span className="text-purple-400 font-mono text-[10px] flex items-center gap-1.5 mb-1 font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  IBM Granite 3.8B Reasoning:
                </span>
                {step.thoughtProcess}
              </div>

              {/* Artifacts Badge List */}
              {step.artifactsProduced && step.artifactsProduced.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-2">
                  <span className="text-[10px] text-slate-500">Artifacts:</span>
                  {step.artifactsProduced.map((art, aIdx) => (
                    <span
                      key={aIdx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-blue-300 border border-slate-700"
                    >
                      <FileCode2 className="w-3 h-3 text-blue-400" />
                      {art}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
