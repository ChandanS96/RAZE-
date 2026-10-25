import React, { useState } from 'react';
import {
  Crosshair,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';

interface Counterexample {
  id: string;
  attemptNumber: number;
  testName: string;
  inputVector: string;
  expectedOutput: string;
  actualOutput: string;
  reproductionCommand: string;
  failureEvidence: string;
  sourceLocation?: string;
  confirmed: boolean;
  timestamp: string;
}

interface CounterexampleCardProps {
  counterexamples: Counterexample[];
  trustCollapsed: boolean;
  trustCollapseReason?: string;
}

export const CounterexampleCard: React.FC<CounterexampleCardProps> = ({
  counterexamples,
  trustCollapsed,
  trustCollapseReason
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Signature Feature: Trust Collapse Engine Banner */}
      {trustCollapsed && (
        <div className="p-4 rounded-xl glass-panel-danger flex items-start gap-3.5 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-status-blocked/20 flex items-center justify-center text-status-blocked flex-shrink-0">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-status-blocked">
                TRUST COLLAPSE ENGINE TRIGGERED
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-blocked/20 text-status-blocked">
                Approval Blocked
              </span>
            </div>
            <p className="text-xs text-text-primary leading-relaxed">
              {trustCollapseReason ||
                'Adversarial tests falsified the repair claim. Automatic approval was immediately terminated and failure evidence was dispatched to the repair workflow.'}
            </p>
          </div>
        </div>
      )}

      {/* Discovered Counterexamples List */}
      {counterexamples.length === 0 ? (
        <div className="p-8 text-center text-text-muted glass-panel rounded-xl">
          <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-50 text-status-pass" />
          <p className="text-xs">Zero adversarial counterexamples active on the latest verified patch.</p>
          <p className="text-[11px] text-text-muted mt-1">
            All boundary vectors, malformed types, and negative inputs satisfied system specifications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
            <span>Falsification Evidence ({counterexamples.length} Discovered)</span>
            <span className="text-[11px] text-text-secondary font-mono">Executable Edge Cases</span>
          </div>

          {counterexamples.map((cx) => (
            <div
              key={cx.id}
              className="p-4 rounded-xl bg-black/50 backdrop-blur-2xl border border-status-blocked/30 space-y-3 shadow-glass"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-status-blocked/15 flex items-center justify-center text-status-blocked">
                    <Crosshair className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">{cx.testName}</div>
                    <div className="text-[10px] text-text-muted font-mono">
                      Discovered in Attempt #{cx.attemptNumber} • Confirmed Executable Check
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-status-blocked/10 text-status-blocked border border-status-blocked/20">
                  Confirmed Falsification
                </span>
              </div>

              {/* Input Vector and Output Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-black/70 border border-white/10">
                  <span className="text-[10px] text-text-muted block font-mono">Boundary Input Vector:</span>
                  <code className="text-brand-magenta font-mono text-[11px] font-semibold">{cx.inputVector}</code>
                </div>
                <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 space-y-1">
                  <span className="text-[10px] text-text-muted block font-mono">Expected vs Actual:</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-status-pass font-mono font-medium truncate">{cx.expectedOutput}</span>
                    <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="text-status-blocked font-mono font-medium truncate">{cx.actualOutput}</span>
                  </div>
                </div>
              </div>

              {/* Reproduction Command */}
              <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <Terminal className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span className="text-text-secondary truncate text-[11px]">{cx.reproductionCommand}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(cx.reproductionCommand, cx.id)}
                  className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white transition-colors flex-shrink-0"
                  title="Copy reproduction command"
                >
                  {copiedCmd === cx.id ? (
                    <Check className="w-3.5 h-3.5 text-status-pass" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Bounded Failure Evidence Log */}
              {cx.failureEvidence && (
                <div className="p-2 rounded-lg bg-black/80 border border-white/10 font-mono text-[10px] text-status-blocked/90 max-h-20 overflow-y-auto whitespace-pre-wrap">
                  {cx.failureEvidence}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
