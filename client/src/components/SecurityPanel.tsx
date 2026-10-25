import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface SecurityFinding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  title: string;
  affectedFile: string;
  lineRange: string;
  detectionMethod: string;
  evidence: string;
  recommendedMitigation: string;
  isConfirmed: boolean;
  blocksRelease: boolean;
  timestamp: string;
}

interface SecurityPanelProps {
  findings: SecurityFinding[];
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({
  findings,
  circuitBreakerTripped,
  circuitBreakerReason
}) => {
  return (
    <div className="space-y-4">
      {/* Circuit Breaker Status Banner */}
      {circuitBreakerTripped ? (
        <div className="p-4 rounded-xl glass-panel-danger flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-blocked/20 flex items-center justify-center text-status-blocked flex-shrink-0">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-status-blocked">
                SECURITY CIRCUIT BREAKER TRIPPED
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-blocked/20 text-status-blocked">
                Execution Safely Halted
              </span>
            </div>
            <p className="text-xs text-text-primary mt-1">
              {circuitBreakerReason || 'A dangerous security condition was detected in the proposed patch diff.'}
            </p>
            <p className="text-[11px] text-text-secondary mt-1">
              Diagnostic evidence has been preserved. The execution was terminated without arbitrary host exposure.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-status-pass/15 flex items-center justify-center text-status-pass">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Security Circuit Breaker Nominal</div>
              <div className="text-[10px] text-text-muted">No prohibited files, un-sandboxed operations, or timeouts</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-pass/10 text-status-pass border border-status-pass/20">
            Nominal (Arm State)
          </span>
        </div>
      )}

      {/* Security Findings List */}
      {findings.length === 0 ? (
        <div className="p-8 text-center text-text-muted glass-panel rounded-xl">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50 text-status-pass" />
          <p className="text-xs">Zero security vulnerabilities or prohibited operations detected.</p>
          <p className="text-[11px] text-text-muted mt-1">
            AST scanner validated that no eval calls, command injections, or exposed secret patterns were introduced.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
            <span>Security Guardian Findings ({findings.length})</span>
            <span className="text-[11px] text-text-secondary font-mono">AST & Rule Engine</span>
          </div>

          {findings.map((finding) => {
            const isCritical = finding.severity === 'CRITICAL';
            const isHigh = finding.severity === 'HIGH';

            return (
              <div
                key={finding.id}
                className={`p-4 rounded-xl border space-y-2.5 shadow-glass ${
                  isCritical
                    ? 'bg-status-blocked/10 border-status-blocked/40'
                    : isHigh
                    ? 'bg-status-warning/10 border-status-warning/40'
                    : 'bg-black/50 backdrop-blur-2xl border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isCritical
                          ? 'bg-status-blocked text-white'
                          : isHigh
                          ? 'bg-status-warning text-black font-extrabold'
                          : 'bg-brand-magenta text-white'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-xs font-bold text-white">{finding.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    Method: {finding.detectionMethod}
                  </span>
                </div>

                <div className="text-xs font-mono text-text-secondary">
                  Location: <strong className="text-white">{finding.affectedFile}</strong> ({finding.lineRange})
                </div>

                <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 font-mono text-[11px] text-text-secondary space-y-1">
                  <div className="text-text-muted text-[10px] uppercase font-semibold">Evidence Artifact:</div>
                  <div className="text-white whitespace-pre-wrap">{finding.evidence}</div>
                </div>

                <div className="text-xs text-brand-neon flex items-start gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Remediation:</strong> {finding.recommendedMitigation}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
