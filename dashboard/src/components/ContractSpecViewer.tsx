import React, { useState } from 'react';
import { FileText, Copy, Check, Send, Play, Activity } from 'lucide-react';

interface ContractSpecViewerProps {
  openApiYaml: string;
}

export const ContractSpecViewer: React.FC<ContractSpecViewerProps> = ({ openApiYaml }) => {
  const [copied, setCopied] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState<'POST /orders' | 'GET /orders' | 'GET /orders/{id}'>('POST /orders');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ code: number; text: string; latencyMs: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(openApiYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Executes a real HTTP contract test against the live backend
   */
  const handleExecuteLiveContract = async () => {
    setIsTesting(true);
    setTestResponse(null);
    setTestStatus(null);
    const start = Date.now();

    try {
      // 1. Authenticate with live server to acquire verified JWT Bearer token
      const loginRes = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'password123' })
      });

      let token = 'mock-bearer-token';
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        token = loginData.token;
      }

      let res: Response;

      // 2. Dispatch real HTTP request based on selected contract endpoint
      if (testEndpoint === 'POST /orders') {
        res = await fetch('http://localhost:4000/api/orders/checkout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: [{ productId: 1, quantity: 2 }],
            paymentMethod: 'CREDIT_CARD',
            customShippingAddress: '124 Cloud Way, Austin, TX'
          })
        });
      } else if (testEndpoint === 'GET /orders') {
        res = await fetch('http://localhost:4000/api/orders', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        // GET /orders/101 (or first available order)
        res = await fetch('http://localhost:4000/api/orders/101', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      const latencyMs = Date.now() - start;
      const data = await res.json();

      setTestStatus({
        code: res.status,
        text: res.statusText || (res.status === 201 ? 'Created' : 'OK'),
        latencyMs
      });
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      setTestStatus({
        code: 500,
        text: 'Network Error',
        latencyMs
      });
      setTestResponse(JSON.stringify({ error: 'Failed to connect to backend', message: err.message }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Synthesized OpenAPI 3.1 Specification
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Standardized machine-readable contract defining microservice boundaries and endpoints
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{copied ? 'Copied YAML' : 'Copy Spec YAML'}</span>
        </button>
      </div>

      {/* Main Grid: YAML Viewer on Left, Endpoint Tester on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: YAML Code Box */}
        <div className="lg:col-span-2 rounded-xl bg-[#090d16] border border-slate-800/80 overflow-hidden flex flex-col">
          <div className="px-3.5 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>orders-service/openapi.yaml</span>
            <span className="text-[10px] text-cyan-400 font-semibold">OpenAPI 3.1.0</span>
          </div>

          <pre className="p-4 text-[11px] font-mono text-cyan-100 overflow-x-auto max-h-[420px] overflow-y-auto leading-relaxed">
            <code>{openApiYaml || '# OpenAPI specification will be generated upon running decomposition.'}</code>
          </pre>
        </div>

        {/* Right: Live HTTP Contract Sandbox */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800/80 p-4 flex flex-col space-y-3">
          <div className="text-xs font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Send className="w-4 h-4 text-cyan-400" />
              Live Contract Execution Sandbox
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <Activity className="w-3 h-3" /> Live Target
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Executes real HTTP requests against the live backend server to validate contract compliance:
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400">Endpoint Target:</label>
            <div className="space-y-1">
              {(['POST /orders', 'GET /orders', 'GET /orders/{id}'] as const).map((ep) => (
                <button
                  key={ep}
                  onClick={() => { setTestEndpoint(ep); setTestResponse(null); setTestStatus(null); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition ${
                    testEndpoint === ep
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span className={ep.startsWith('POST') ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                    {ep.split(' ')[0]}
                  </span>{' '}
                  <span className="text-slate-300">{ep.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExecuteLiveContract}
            disabled={isTesting}
            className="flex items-center justify-center space-x-1.5 w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Executing Live Request...' : 'Test Live Contract'}</span>
          </button>

          {/* Test Response Box with Live HTTP Status */}
          {testResponse && testStatus && (
            <div className="mt-2 rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-[160px]">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[9px] text-slate-400 mb-1">
                <span className={testStatus.code < 300 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  HTTP {testStatus.code} {testStatus.text}
                </span>
                <span className="text-cyan-400 font-mono">{testStatus.latencyMs}ms</span>
              </div>
              <pre>{testResponse}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
