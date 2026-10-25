import React, { useState } from 'react';
import {
  Search,
  Wrench,
  Crosshair,
  ShieldAlert,
  Gauge,
  Scale,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Terminal
} from 'lucide-react';

interface AgentData {
  role: string;
  name: string;
  status: 'waiting' | 'running' | 'completed' | 'failed' | 'blocked';
  summary?: string;
  findingsCount?: number;
  logs: string[];
  outputArtifacts?: Record<string, any>;
}

interface AgentPipelineProps {
  agents: Record<string, AgentData>;
  currentStatus: string;
}

export const AgentPipeline: React.FC<AgentPipelineProps> = ({ agents, currentStatus }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agentConfig: Array<{ role: string; name: string; icon: any; desc: string }> = [
    {
      role: 'investigator',
      name: 'Repository Investigator',
      icon: Search,
      desc: 'Reproduces baseline bug, maps affected symbols, retrieves memory'
    },
    {
      role: 'repair_engineer',
      name: 'Autonomous Repair Engineer',
      icon: Wrench,
      desc: 'Synthesizes minimal patch, computes SHA-256 hash, binds changes'
    },
    {
      role: 'counterexample_hunter',
      name: 'Adversarial Hunter',
      icon: Crosshair,
      desc: 'Falsifies claims, tests boundary vectors & malformed inputs'
    },
    {
      role: 'security_guardian',
      name: 'Security Guardian',
      icon: ShieldAlert,
      desc: 'AST security rules, path traversal detection, circuit breaker'
    },
    {
      role: 'test_integrity_engineer',
      name: 'Test Integrity Engineer',
      icon: Gauge,
      desc: 'Mutation testing score, checks mutant survival & test gaps'
    },
    {
      role: 'evidence_judge',
      name: 'Evidence Judge & Gate',
      icon: Scale,
      desc: 'Deterministic policy evaluation, seals verified patch hash'
    }
  ];

  const getStatusBadge = (status: AgentData['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-status-pass bg-status-pass/10 px-2 py-0.5 rounded-full border border-status-pass/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-brand-magenta bg-brand-magenta/15 px-2 py-0.5 rounded-full border border-brand-magenta/35 agent-running-pulse shadow-nebula-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-magenta"></span> Active
          </span>
        );
      case 'failed':
      case 'blocked':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-status-blocked bg-status-blocked/10 px-2 py-0.5 rounded-full border border-status-blocked/25">
            <XCircle className="w-3 h-3" /> {status === 'blocked' ? 'Blocked' : 'Failed'}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/10">
            <Clock className="w-3 h-3" /> Waiting
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Autonomous Agent Execution Pipeline (6 Specialized Agents)
        </h3>
        <span className="text-[11px] text-text-secondary font-mono">
          State: <strong className="text-brand-magenta">{currentStatus}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agentConfig.map((item, index) => {
          const Icon = item.icon;
          const agentData = agents[item.role] || {
            role: item.role,
            name: item.name,
            status: 'waiting',
            logs: []
          };
          const isSelected = selectedAgent === item.role;

          return (
            <div
              key={item.role}
              onClick={() => setSelectedAgent(isSelected ? null : item.role)}
              className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                isSelected
                  ? 'glass-panel-glow border-brand-magenta/60 ring-1 ring-brand-magenta/40 shadow-nebula-md'
                  : agentData.status === 'running'
                  ? 'bg-black/60 backdrop-blur-xl border-brand-magenta/50 shadow-nebula-sm'
                  : agentData.status === 'completed'
                  ? 'bg-black/40 backdrop-blur-xl border-white/10 hover:border-brand-magenta/40'
                  : agentData.status === 'blocked' || agentData.status === 'failed'
                  ? 'bg-status-blocked/10 backdrop-blur-xl border-status-blocked/35'
                  : 'bg-black/30 backdrop-blur-xl border-white/5 opacity-80 hover:opacity-100 hover:border-white/15'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      agentData.status === 'completed'
                        ? 'bg-status-pass/15 text-status-pass'
                        : agentData.status === 'running'
                        ? 'bg-brand-magenta/25 text-brand-magenta shadow-nebula-sm'
                        : agentData.status === 'blocked' || agentData.status === 'failed'
                        ? 'bg-status-blocked/20 text-status-blocked'
                        : 'bg-white/[0.04] text-text-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono text-white/40">#{index + 1}</span>
                    </div>
                    <p className="text-[10px] text-text-secondary truncate max-w-[170px]">{item.desc}</p>
                  </div>
                </div>
                {getStatusBadge(agentData.status)}
              </div>

              {/* Agent Summary line */}
              {agentData.summary && (
                <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-text-secondary line-clamp-2 font-sans bg-black/50 p-1.5 rounded">
                  {agentData.summary}
                </div>
              )}

              {/* Expand Details Trigger */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-brand-magenta font-semibold">
                <span>{isSelected ? 'Collapse Diagnostic Logs' : 'View Findings & Evidence'}</span>
                {isSelected ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </div>

              {/* Expanded Diagnostic Log View */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-border-subtle/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                    <Terminal className="w-3 h-3" />
                    <span>Agent Diagnostic Log Buffer</span>
                  </div>
                  <div className="bg-bg-darkest p-2 rounded-lg font-mono text-[10px] text-text-secondary max-h-36 overflow-y-auto space-y-1 border border-border-subtle">
                    {agentData.logs && agentData.logs.length > 0 ? (
                      agentData.logs.map((log, idx) => (
                        <div key={idx} className="whitespace-pre-wrap leading-relaxed text-text-primary">
                          {log}
                        </div>
                      ))
                    ) : (
                      <span className="text-text-muted italic">No logs recorded yet.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
