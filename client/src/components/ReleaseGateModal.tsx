import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  ShieldCheck,
  Hash,
  AlertCircle
} from 'lucide-react';

interface PolicyRule {
  ruleId: string;
  name: string;
  description: string;
  category: string;
  passed: boolean;
  blocking: boolean;
  evidenceSummary: string;
}

interface PolicyResult {
  recommendation: 'BLOCKED' | 'NEEDS_REVIEW' | 'READY_FOR_HUMAN_REVIEW';
  evaluatedAt: string;
  rulesEvaluated: PolicyRule[];
  blockingReasons: string[];
  warnings: string[];
  knownLimitations: string[];
  patchHashVerified: boolean;
}

interface HumanDecision {
  decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES';
  reviewedPatchHash: string;
  reviewerNotes: string;
  decidedAt: string;
  reviewer: string;
}

interface ReleaseGateModalProps {
  policyResult?: PolicyResult;
  currentPatchHash?: string;
  humanDecision?: HumanDecision;
  onRecordDecision: (decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES', notes: string, reviewer: string) => Promise<void>;
  onRetry: () => Promise<void>;
}

export const ReleaseGateModal: React.FC<ReleaseGateModalProps> = ({
  policyResult,
  currentPatchHash,
  humanDecision,
  onRecordDecision,
  onRetry
}) => {
  const [reviewerName, setReviewerName] = useState('Chandan (Principal Architect)');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recommendation = policyResult?.recommendation || 'NEEDS_REVIEW';

  const handleAction = async (decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES') => {
    if (!reviewerName.trim()) {
      setErrorMsg('Please specify reviewer name');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onRecordDecision(decision, notes, reviewerName);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRecBadge = () => {
    switch (recommendation) {
      case 'READY_FOR_HUMAN_REVIEW':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-status-pass/15 border border-status-pass/30 text-status-pass text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready for Human Review</span>
          </div>
        );
      case 'BLOCKED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-status-blocked/15 border border-status-blocked/30 text-status-blocked text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-4 h-4" />
            <span>Release Blocked by Policy</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-status-warning/15 border border-status-warning/30 text-status-warning text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Needs Manual Review</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Policy Verdict Header */}
      <div className="p-4 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-magenta/15 text-brand-magenta flex items-center justify-center shadow-nebula-sm">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Agent 6: Evidence Judge & Release Gate
            </div>
            <div className="text-[11px] text-text-secondary font-mono">
              Deterministic Backend Policy Evaluation
            </div>
          </div>
        </div>
        {getRecBadge()}
      </div>

      {/* Strict Philosophy Disclaimer */}
      <div className="p-3 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-text-muted leading-relaxed">
        <strong>Guaranteed Evidence Policy:</strong> RAZE never asserts arbitrary code is "100% Safe". We report
        precisely which tests were executed, what passed, which mutants were killed, and the verified SHA-256 hash.
      </div>

      {/* Policy Evaluation Rules Matrix */}
      {policyResult && (
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/80 backdrop-blur-md shadow-glass">
          <div className="px-3.5 py-2.5 bg-black/60 border-b border-white/10 text-xs font-bold text-white uppercase tracking-wider">
            Deterministic Verification Rules ({policyResult.rulesEvaluated.length})
          </div>

          <div className="divide-y divide-white/5 text-xs">
            {policyResult.rulesEvaluated.map((rule) => (
              <div key={rule.ruleId} className="p-3 flex items-start justify-between gap-3 hover:bg-white/5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{rule.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/70 text-text-muted border border-white/10">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">{rule.description}</p>
                  <p className="text-[10px] font-mono text-brand-neon">Evidence: {rule.evidenceSummary}</p>
                </div>

                <div className="flex-shrink-0">
                  {rule.passed ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-status-pass bg-status-pass/10 px-2 py-0.5 rounded-full border border-status-pass/20">
                      <CheckCircle2 className="w-3 h-3" /> PASS
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-status-blocked bg-status-blocked/10 px-2 py-0.5 rounded-full border border-status-blocked/20">
                      <XCircle className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocking Reasons Callout if any */}
      {policyResult && policyResult.blockingReasons.length > 0 && (
        <div className="p-3.5 rounded-xl bg-status-blocked/10 border border-status-blocked/30 space-y-1.5">
          <div className="text-xs font-bold text-status-blocked flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>Approval Blocked by Following Conditions:</span>
          </div>
          <ul className="text-xs text-text-secondary space-y-1 pl-5 list-disc">
            {policyResult.blockingReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Human Decision Section */}
      <div className="p-4 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-magenta" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Human Sign-Off & Integration Gate
            </span>
          </div>
          {currentPatchHash && (
            <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
              <Hash className="w-3 h-3 text-brand-neon" />
              Bound to: {currentPatchHash.substring(0, 12)}...
            </span>
          )}
        </div>

        {humanDecision ? (
          <div className="p-3 rounded-lg bg-black/70 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-status-pass flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Decision: {humanDecision.decision}
              </span>
              <span className="text-[10px] text-text-muted font-mono">{humanDecision.decidedAt}</span>
            </div>
            <div className="text-xs text-text-secondary">
              Reviewer: <strong className="text-white">{humanDecision.reviewer}</strong>
            </div>
            {humanDecision.reviewerNotes && (
              <div className="text-xs text-text-secondary italic">"{humanDecision.reviewerNotes}"</div>
            )}
            <div className="text-[10px] font-mono text-text-muted truncate">
              Sealed Patch SHA-256: {humanDecision.reviewedPatchHash}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-mono font-semibold text-text-muted block mb-1">
                  Reviewer Identity
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-magenta font-mono transition-all"
                  placeholder="Reviewer Name"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono font-semibold text-text-muted block mb-1">
                  Decision Notes / Reason
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-magenta transition-all"
                  placeholder="Verification audit notes..."
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-status-blocked flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                disabled={submitting || recommendation === 'BLOCKED'}
                onClick={() => handleAction('APPROVED')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  recommendation === 'BLOCKED'
                    ? 'bg-status-pass/20 text-status-pass/40 cursor-not-allowed border border-status-pass/10'
                    : 'bg-status-pass hover:bg-status-pass/90 text-black shadow-status-pass/20 cursor-pointer'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve for Integration (Hash Verified)</span>
              </button>

              <button
                disabled={submitting}
                onClick={() => handleAction('REJECTED')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-status-blocked/15 hover:bg-status-blocked/25 border border-status-blocked/30 text-status-blocked text-xs font-semibold transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Patch</span>
              </button>

              <button
                disabled={submitting}
                onClick={onRetry}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-magenta/15 hover:bg-brand-magenta/25 border border-brand-magenta/30 text-brand-magenta text-xs font-semibold transition-all shadow-nebula-sm"
              >
                <span>Trigger Next Repair Iteration</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
