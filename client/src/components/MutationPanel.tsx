import React, { useState } from 'react';
import {
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Code2,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface Mutant {
  id: string;
  file: string;
  line: number;
  originalOp: string;
  mutatedOp: string;
  mutantCodeSnippet: string;
  status: 'KILLED' | 'SURVIVED' | 'TIMED_OUT';
  killingTest?: string;
  suggestedStrongerTest?: string;
}

interface MutationReport {
  totalMutants: number;
  mutantsKilled: number;
  mutantsSurvived: number;
  mutantsTimedOut: number;
  mutationScore: number;
  mutants: Mutant[];
  survivingAnalysis: string;
}

interface MutationPanelProps {
  mutationReport?: MutationReport;
}

export const MutationPanel: React.FC<MutationPanelProps> = ({ mutationReport }) => {
  const [selectedMutant, setSelectedMutant] = useState<Mutant | null>(null);

  if (!mutationReport) {
    return (
      <div className="p-8 text-center text-text-muted glass-panel rounded-xl">
        <Gauge className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">Mutation testing has not been executed for this attempt.</p>
        <p className="text-[11px] text-text-muted mt-1">
          Agent 5 (Test Integrity Engineer) introduces synthetic mutants during Phase 5.5 of verification.
        </p>
      </div>
    );
  }

  const scoreColor =
    mutationReport.mutationScore >= 80
      ? 'text-status-pass border-status-pass'
      : mutationReport.mutationScore >= 60
      ? 'text-status-warning border-status-warning'
      : 'text-status-blocked border-status-blocked';

  return (
    <div className="space-y-4">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Mutation Score Gauge */}
        <div className="p-3.5 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Mutation Trust Score</div>
          <div className="flex items-baseline gap-1 my-1">
            <span className={`text-2xl font-extrabold ${scoreColor}`}>
              {mutationReport.mutationScore}%
            </span>
            <span className="text-[11px] text-text-muted font-mono">({mutationReport.mutantsKilled}/{mutationReport.totalMutants})</span>
          </div>
          <div className="w-full bg-black/80 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-brand-magenta to-[#9B5CFF] h-full rounded-full transition-all duration-500 shadow-nebula-sm"
              style={{ width: `${mutationReport.mutationScore}%` }}
            ></div>
          </div>
        </div>

        {/* Mutants Killed */}
        <div className="p-3.5 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
            <span>Mutants Killed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-status-pass" />
          </div>
          <div className="text-2xl font-extrabold text-status-pass mt-1">
            {mutationReport.mutantsKilled}
          </div>
          <div className="text-[10px] text-text-secondary mt-1">Caught by challenge test assertions</div>
        </div>

        {/* Mutants Survived */}
        <div className="p-3.5 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
            <span>Mutants Survived</span>
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
          </div>
          <div className="text-2xl font-extrabold text-status-warning mt-1">
            {mutationReport.mutantsSurvived}
          </div>
          <div className="text-[10px] text-text-secondary mt-1">Indicates potential test coverage gaps</div>
        </div>

        {/* Mutants Timed Out */}
        <div className="p-3.5 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
            <span>Execution Status</span>
            <Clock className="w-3.5 h-3.5 text-brand-neon" />
          </div>
          <div className="text-sm font-semibold text-white mt-2">
            AST Synthesized
          </div>
          <div className="text-[10px] text-text-secondary mt-1">Real executed mutations in shadow workspace</div>
        </div>
      </div>

      {/* Analysis Callout */}
      <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-start gap-2.5 text-xs">
        <Lightbulb className="w-4 h-4 text-brand-neon flex-shrink-0 mt-0.5" />
        <div className="text-text-secondary leading-relaxed">
          <strong className="text-white">Integrity Verdict:</strong> {mutationReport.survivingAnalysis}
          <div className="text-[11px] text-text-muted mt-1">
            *Note: Surviving mutants may indicate subtle boundary omissions, equivalent mutations, or test configuration boundaries.
          </div>
        </div>
      </div>

      {/* Interactive Mutants Table */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/80 backdrop-blur-md shadow-glass">
        <div className="p-3 bg-black/60 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Synthesized Code Mutants ({mutationReport.mutants.length})
          </span>
          <span className="text-[11px] text-text-muted">Click any mutant to inspect AST diff & suggested tests</span>
        </div>

        <div className="divide-y divide-white/5 text-xs font-mono">
          {mutationReport.mutants.map((mutant) => {
            const isSelected = selectedMutant?.id === mutant.id;
            return (
              <div key={mutant.id} className="transition-colors hover:bg-white/5">
                <div
                  onClick={() => setSelectedMutant(isSelected ? null : mutant)}
                  className="p-3 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 overflow-hidden mr-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0 ${
                        mutant.status === 'KILLED'
                          ? 'bg-status-pass/15 text-status-pass border border-status-pass/20'
                          : mutant.status === 'SURVIVED'
                          ? 'bg-status-warning/15 text-status-warning border border-status-warning/20'
                          : 'bg-status-blocked/15 text-status-blocked border border-status-blocked/20'
                      }`}
                    >
                      {mutant.status}
                    </span>
                    <span className="text-text-secondary text-[11px] truncate">
                      {mutant.file}:L{mutant.line}
                    </span>
                    <span className="text-text-muted text-[11px] hidden sm:inline truncate">
                      {mutant.originalOp} → <strong className="text-brand-magenta">{mutant.mutatedOp}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mutant.status === 'KILLED' && mutant.killingTest && (
                      <span className="text-[10px] text-text-muted hidden md:inline truncate max-w-[150px]">
                        Caught by: {mutant.killingTest}
                      </span>
                    )}
                    {isSelected ? <ChevronDown className="w-3.5 h-3.5 text-brand-magenta" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
                  </div>
                </div>

                {/* Expanded Mutant Details */}
                {isSelected && (
                  <div className="p-4 bg-black/60 border-t border-white/10 space-y-3 font-sans">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-semibold text-text-muted uppercase">Mutation Diff:</span>
                      <div className="p-2.5 rounded-lg bg-black/80 border border-white/10 font-mono text-xs space-y-1">
                        <div className="text-status-blocked">- {mutant.originalOp}</div>
                        <div className="text-status-pass font-bold">+ {mutant.mutatedOp}</div>
                      </div>
                    </div>

                    {mutant.killingTest && (
                      <div className="text-xs">
                        <span className="text-text-muted font-semibold">Killing Test Suite Assertion:</span>{' '}
                        <code className="text-status-pass font-mono text-[11px]">{mutant.killingTest}</code>
                      </div>
                    )}

                    {mutant.suggestedStrongerTest && (
                      <div className="p-3 rounded-lg bg-brand-neon/10 border border-brand-neon/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-neon">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Agent 5 Recommendation: Strengthen Test Suite with this Case</span>
                        </div>
                        <pre className="font-mono text-[11px] text-white p-2 rounded bg-black/90 overflow-x-auto whitespace-pre-wrap border border-white/10">
                          {mutant.suggestedStrongerTest}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
