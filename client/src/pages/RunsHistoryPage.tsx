import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitBranch,
  ArrowRight,
  Zap,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { fetchRuns } from '../api/client.js';

interface RunsHistoryPageProps {
  onNavigate: (path: string) => void;
}

export const RunsHistoryPage: React.FC<RunsHistoryPageProps> = ({ onNavigate }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'COLLAPSED' | 'BLOCKED'>('ALL');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchRuns();
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.repositoryName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'READY') return run.recommendation === 'READY_FOR_HUMAN_REVIEW';
    if (statusFilter === 'COLLAPSED') return run.trustCollapsed;
    if (statusFilter === 'BLOCKED') return run.status === 'BLOCKED' || run.recommendation === 'BLOCKED';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-brand-magenta" />
            <span>Searchable Verification History</span>
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Durable trajectory records with cryptographically sealed patch hashes and evidence reports.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/verify/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-magenta to-[#9B5CFF] hover:opacity-90 text-white text-xs font-bold transition-all shadow-nebula-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Verification Run</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md px-3 py-1.5 rounded-lg bg-black/60 border border-white/10">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Run ID or Repository..."
            className="w-full bg-transparent text-xs text-white placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Runs' },
            { id: 'READY', label: 'Ready for Review' },
            { id: 'COLLAPSED', label: 'Trust Collapsed' },
            { id: 'BLOCKED', label: 'Blocked' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-brand-magenta to-[#9B5CFF] text-white shadow-nebula-sm font-semibold'
                  : 'bg-black/60 text-text-secondary hover:text-white border border-white/10 hover:border-brand-magenta/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-text-muted hover:text-white ml-1 transition-colors hover:border-brand-magenta/40"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/80 backdrop-blur-md shadow-glass">
        {filteredRuns.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-magenta" />
            <p className="text-xs">No verification runs matched the current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 text-xs">
            {filteredRuns.map((run) => (
              <div
                key={run.id}
                onClick={() => onNavigate(`/runs/${run.id}`)}
                className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden mr-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-magenta/15 border border-brand-magenta/30 flex items-center justify-center flex-shrink-0 text-brand-magenta shadow-nebula-sm">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{run.repositoryName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 text-text-secondary border border-white/10">
                        {run.id}
                      </span>
                      {run.trustCollapsed && (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-status-blocked/15 text-status-blocked border border-status-blocked/30">
                          <Zap className="w-3 h-3" /> Falsified & Collapsed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-muted mt-1 font-mono">
                      Attempt #{run.currentAttempt} • Created at {new Date(run.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span
                    className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      run.recommendation === 'READY_FOR_HUMAN_REVIEW'
                        ? 'bg-status-pass/15 text-status-pass border border-status-pass/30'
                        : run.status === 'TRUST_COLLAPSED' || run.recommendation === 'BLOCKED'
                        ? 'bg-status-blocked/15 text-status-blocked border border-status-blocked/30'
                        : 'bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30'
                    }`}
                  >
                    {run.recommendation || run.status}
                  </span>

                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
