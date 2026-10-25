import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Zap,
  Play,
  RotateCcw,
  Download,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Terminal,
  Scale,
  Crosshair,
  Gauge,
  ShieldAlert,
  ArrowRight,
  Hash,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { fetchRun, retryRun, recordDecision, VerificationRun } from '../api/client.js';
import { useSSE } from '../hooks/useSSE.js';
import { AgentPipeline } from '../components/AgentPipeline.js';
import { DiffViewer } from '../components/DiffViewer.js';
import { CounterexampleCard } from '../components/CounterexampleCard.js';
import { MutationPanel } from '../components/MutationPanel.js';
import { SecurityPanel } from '../components/SecurityPanel.js';
import { ReleaseGateModal } from '../components/ReleaseGateModal.js';

interface LiveRoomProps {
  runId: string;
  onNavigate: (path: string) => void;
  onOpenAssistant: () => void;
}

export const LiveVerificationRoomPage: React.FC<LiveRoomProps> = ({ runId, onNavigate, onOpenAssistant }) => {
  const [run, setRun] = useState<VerificationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChallengeTab, setActiveChallengeTab] = useState<'counterexamples' | 'mutations' | 'security' | 'raw_logs'>('counterexamples');
  const [copiedHash, setCopiedHash] = useState(false);

  // Load initial run data
  const loadRun = useCallback(async () => {
    try {
      const data = await fetchRun(runId);
      setRun(data);
    } catch (err) {
      console.error('Failed to load verification run:', err);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  // Connect to SSE event stream
  useSSE(runId, (event) => {
    // Whenever an event fires from the backend state machine, re-fetch fresh run state
    loadRun();
  });

  const handleRetry = async () => {
    try {
      await retryRun(runId);
      loadRun();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleRecordDecision = async (
    decision: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES',
    notes: string,
    reviewer: string
  ) => {
    if (!run?.currentPatchHash) {
      throw new Error('No verified patch hash available to sign');
    }
    await recordDecision(runId, {
      decision,
      reviewedPatchHash: run.currentPatchHash,
      notes,
      reviewer
    });
    loadRun();
  };

  const handleCopyHash = () => {
    if (run?.currentPatchHash) {
      navigator.clipboard.writeText(run.currentPatchHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (loading || !run) {
    return (
      <div className="p-12 text-center text-text-muted space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-magenta border-t-transparent animate-spin mx-auto shadow-nebula-sm"></div>
        <p className="text-xs font-mono text-text-secondary">Initializing Live Verification Room [{runId}]...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Verification Snapshot Bar */}
      <div className="p-4 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-glass">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-neon via-brand-violet to-brand-magenta text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-magenta/25">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white">{run.bugReport.title}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-text-secondary border border-white/10">
                {run.repositoryName} • {run.branch}
              </span>
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-3 font-mono">
              <span>Run ID: {run.id}</span>
              <span>Attempt #{run.currentAttempt} of {run.maxRetries}</span>
              {run.completedAt && (
                <span className="text-white/40">Completed: {new Date(run.completedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Patch Hash & Report Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          {run.currentPatchHash && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono shadow-sm">
              <Hash className="w-3.5 h-3.5 text-brand-magenta" />
              <span className="text-white/40 text-[11px]">Patch:</span>
              <span className="text-white font-semibold">{run.currentPatchHash.substring(0, 10)}...</span>
              <button
                onClick={handleCopyHash}
                className="ml-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Copy SHA-256 Hash"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-status-pass" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Download Evidence Reports */}
          <a
            href={`/api/runs/${run.id}/evidence?format=markdown`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-brand-magenta/15 border border-white/10 hover:border-brand-magenta/40 text-xs font-medium text-white transition-all shadow-sm"
            title="Download full Markdown report"
          >
            <Download className="w-3.5 h-3.5 text-brand-magenta" />
            <span>Markdown</span>
          </a>

          <a
            href={`/api/runs/${run.id}/evidence?format=json`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-brand-magenta/15 border border-white/10 hover:border-brand-magenta/40 text-xs font-medium text-white transition-all shadow-sm"
            title="Download full JSON report"
          >
            <Download className="w-3.5 h-3.5 text-brand-neon" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      {/* Signature Banner: Trust Collapse Engine Alert if triggered */}
      {run.trustCollapsed && (
        <div className="p-4 rounded-xl glass-panel-danger flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-status-blocked animate-pulse flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-status-blocked">
                  Trust Collapse Engine Activated
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-blocked/20 text-status-blocked border border-status-blocked/30">
                  Stage 5: Falsification Confirmed
                </span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                {run.trustCollapseReason ||
                  'The initial patch proposed in Attempt #1 was challenged by the Adversarial Hunter. An executable check exposed an unhandled boundary failure, automatically collapsing trust and dispatching failure evidence for Attempt #2.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveChallengeTab('counterexamples')}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-status-blocked/25 hover:bg-status-blocked/40 text-white border border-status-blocked/50 font-bold transition-all shadow-sm cursor-pointer"
          >
            View Counterexample
          </button>
        </div>
      )}

      {/* AREA A: Agent Workflow (6 Specialized Agents) */}
      <div className="p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
        <AgentPipeline agents={run.agents} currentStatus={run.status} />
      </div>

      {/* 2-Column Split: AREA B (Code Diff) & AREA C (Challenge Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AREA B: Code Diff & Attempt History (6 Cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 space-y-4 shadow-glass">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-magenta" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Area B: Synthesized Patch Diff & Hash
              </h2>
            </div>
            <span className="text-[11px] text-white/40 font-mono">{run.attempts.length} Attempt(s)</span>
          </div>

          <DiffViewer attempts={run.attempts} currentPatchHash={run.currentPatchHash} />
        </div>

        {/* AREA C: Challenge Results (6 Cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 space-y-4 flex flex-col shadow-glass">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-brand-magenta" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Area C: Challenge Evidence & Security
              </h2>
            </div>

            {/* Tab Nav */}
            <div className="flex items-center gap-1">
              {[
                { id: 'counterexamples', label: `Counterexamples (${run.counterexamples.length})`, icon: Crosshair },
                { id: 'mutations', label: `Mutation Score (${run.mutationReport?.mutationScore ?? 0}%)`, icon: Gauge },
                { id: 'security', label: `Security (${run.securityFindings.length})`, icon: ShieldAlert }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChallengeTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeChallengeTab === tab.id
                      ? 'bg-gradient-to-r from-brand-neon to-brand-magenta text-white shadow-nebula-sm font-bold'
                      : 'bg-black/50 text-text-secondary hover:text-white border border-white/10'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab Panel Body */}
          <div className="flex-1 overflow-y-auto">
            {activeChallengeTab === 'counterexamples' && (
              <CounterexampleCard
                counterexamples={run.counterexamples}
                trustCollapsed={run.trustCollapsed}
                trustCollapseReason={run.trustCollapseReason}
              />
            )}

            {activeChallengeTab === 'mutations' && (
              <MutationPanel mutationReport={run.mutationReport} />
            )}

            {activeChallengeTab === 'security' && (
              <SecurityPanel
                findings={run.securityFindings}
                circuitBreakerTripped={run.circuitBreakerTripped}
                circuitBreakerReason={run.circuitBreakerReason}
              />
            )}
          </div>
        </div>
      </div>

      {/* AREA D: Release Gate & Deterministic Policy Enforcement */}
      <div className="p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
        <ReleaseGateModal
          policyResult={run.policyResult}
          currentPatchHash={run.currentPatchHash}
          humanDecision={run.humanDecision}
          onRecordDecision={handleRecordDecision}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
};
