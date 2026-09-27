import React from 'react';
import { X, Download, FolderArchive, Folder, FileCode, Check, Copy } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: { filePath: string; description: string; language: string }[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, files }) => {
  const [copiedCmd, setCopiedCmd] = React.useState(false);

  if (!isOpen) return null;

  const quickstartCmd = `unzip bobmigrate-orders-service.zip && cd orders-service && npm install && npm test && docker compose up -d`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(quickstartCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl p-6 border border-slate-700 shadow-2xl bg-[#0f1422] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-md shadow-blue-500/20 flex-shrink-0">
              <div className="w-full h-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center overflow-hidden p-1">
                <img src="/logo-icon.png" alt="BobMigrate Mascot" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Export Decomposed Microservice Repository
              </h3>
              <p className="text-xs text-slate-400">
                Ready-to-deploy isolated Orders Microservice package (Node.js + Tests + Docker)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Tree Preview */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">
            Package Contents ({files.length + 3} files):
          </div>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 max-h-[220px] overflow-y-auto space-y-1.5 font-mono text-xs text-slate-300">
            <div className="text-blue-400 font-bold flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              <span>orders-service/</span>
            </div>
            {files.map((f, i) => (
              <div key={i} className="pl-4 flex items-center justify-between text-slate-300 hover:text-white">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  {f.filePath}
                </span>
                <span className="text-[10px] text-slate-500">{f.description}</span>
              </div>
            ))}
            <div className="pl-4 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-500" />
                openapi.yaml
              </span>
              <span className="text-[10px] text-slate-500">OpenAPI 3.1 Contract</span>
            </div>
            <div className="pl-4 flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-500" />
                Dockerfile & docker-compose.yml
              </span>
              <span className="text-[10px] text-slate-500">Container orchestration</span>
            </div>
          </div>
        </div>

        {/* Quickstart Command Box */}
        <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>One-Command Setup:</span>
            <button
              onClick={handleCopyCmd}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[10px]"
            >
              {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
            </button>
          </div>
          <code className="block text-[11px] font-mono text-emerald-300 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 overflow-x-auto whitespace-nowrap">
            {quickstartCmd}
          </code>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancel
          </button>

          <a
            href="/bobmigrate-orders-service.zip"
            download="bobmigrate-orders-service.zip"
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download ZIP Package</span>
          </a>
        </div>
      </div>
    </div>
  );
};
