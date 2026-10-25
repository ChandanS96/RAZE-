import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Hash,
  AlertCircle,
  GitCommit,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface PatchAttempt {
  attemptNumber: number;
  patchHash: string;
  diff: string;
  filesChanged: string[];
  explanation: string;
  expectedBehavior: string;
  knownRisks: string[];
  testPassedCount: number;
  testFailedCount: number;
  counterexamplesCount: number;
  status: string;
  createdAt: string;
}

interface DiffViewerProps {
  attempts: PatchAttempt[];
  currentPatchHash?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ attempts, currentPatchHash }) => {
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number>(Math.max(0, attempts.length - 1));
  const [copied, setCopied] = useState(false);

  // Keep selected index in bounds if attempts change
  const activeAttempt = attempts[selectedAttemptIdx] || attempts[attempts.length - 1];

  const handleCopyHash = () => {
    if (activeAttempt) {
      navigator.clipboard.writeText(activeAttempt.patchHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!activeAttempt) {
    return (
      <div className="p-8 text-center text-text-muted glass-panel rounded-xl">
        <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No patch proposals synthesized yet. Agent 2 is standing by.</p>
      </div>
    );
  }

  const diffLines = (activeAttempt.diff || '').split('\n');

  return (
    <div className="space-y-3">
      {/* Attempt Selector Tabs & Patch Hash Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
        {/* Attempt Tabs */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mr-1">Iterations:</span>
          {attempts.map((att, idx) => (
            <button
              key={att.attemptNumber}
              onClick={() => setSelectedAttemptIdx(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedAttemptIdx === idx
                  ? 'bg-gradient-to-r from-brand-magenta to-[#9B5CFF] text-white shadow-nebula-sm font-semibold'
                  : 'bg-black/60 text-text-secondary hover:text-white border border-white/10 hover:border-brand-magenta/30'
              }`}
            >
              {att.status === 'VERIFIED' ? (
                <CheckCircle2 className="w-3 h-3 text-status-pass" />
              ) : att.status === 'REJECTED_TRUST_COLLAPSED' ? (
                <XCircle className="w-3 h-3 text-status-blocked" />
              ) : (
                <GitCommit className="w-3 h-3" />
              )}
              <span>Attempt #{att.attemptNumber}</span>
              {att.status === 'REJECTED_TRUST_COLLAPSED' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-status-blocked/20 text-status-blocked font-mono">Falsified</span>
              )}
            </button>
          ))}
        </div>

        {/* Cryptographic SHA-256 Patch Hash */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono">
          <Hash className="w-3.5 h-3.5 text-brand-neon" />
          <span className="text-text-muted">SHA-256:</span>
          <span className="text-white font-semibold truncate max-w-[200px]" title={activeAttempt.patchHash}>
            {activeAttempt.patchHash}
          </span>
          <button
            onClick={handleCopyHash}
            className="ml-1 p-1 rounded hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            title="Copy SHA-256 Patch Hash"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-status-pass" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Rationale & Known Risks Banner */}
      <div className="p-3.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 space-y-2">
        <div className="text-xs text-text-primary">
          <strong className="text-brand-magenta">Repair Intent:</strong> {activeAttempt.explanation}
        </div>
        <div className="text-[11px] text-text-secondary">
          <strong className="text-text-muted">Expected Behavior:</strong> {activeAttempt.expectedBehavior}
        </div>
        {activeAttempt.knownRisks && activeAttempt.knownRisks.length > 0 && (
          <div className="flex items-start gap-1.5 pt-1 text-[11px] text-status-warning">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Disclosed Limitations:</strong> {activeAttempt.knownRisks.join('; ')}
            </span>
          </div>
        )}
      </div>

      {/* Code Diff Display */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/80 backdrop-blur-md font-mono text-xs shadow-glass">
        <div className="px-4 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between text-text-muted">
          <div className="flex items-center gap-2 text-[11px]">
            <FileCode className="w-3.5 h-3.5 text-brand-magenta" />
            <span className="text-white font-semibold">{activeAttempt.filesChanged.join(', ')}</span>
          </div>
          <span className="text-[10px] text-text-muted">Unified Git Patch Format</span>
        </div>

        <div className="p-4 overflow-x-auto max-h-[380px] overflow-y-auto space-y-0.5">
          {diffLines.map((line, idx) => {
            const isAdd = line.startsWith('+') && !line.startsWith('+++');
            const isDel = line.startsWith('-') && !line.startsWith('---');
            const isHunk = line.startsWith('@@');
            const isHeader = line.startsWith('---') || line.startsWith('+++');

            let lineStyle = 'text-text-secondary';
            let bgStyle = '';

            if (isAdd) {
              lineStyle = 'text-status-pass font-semibold';
              bgStyle = 'bg-status-pass/10 border-l-2 border-status-pass pl-2 -ml-2';
            } else if (isDel) {
              lineStyle = 'text-status-blocked line-through opacity-80';
              bgStyle = 'bg-status-blocked/10 border-l-2 border-status-blocked pl-2 -ml-2';
            } else if (isHunk) {
              lineStyle = 'text-brand-neon font-bold';
              bgStyle = 'bg-brand-neon/10 py-0.5';
            } else if (isHeader) {
              lineStyle = 'text-brand-magenta font-semibold';
            }

            return (
              <div key={idx} className={`py-0.5 leading-relaxed flex items-start gap-3 ${bgStyle}`}>
                <span className="text-[10px] text-text-muted/60 select-none w-6 text-right font-mono flex-shrink-0">
                  {idx + 1}
                </span>
                <span className={`whitespace-pre font-mono ${lineStyle}`}>{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
