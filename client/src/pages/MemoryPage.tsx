import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Trash2,
  CheckCircle2,
  Tag,
  Crosshair,
  Gauge,
  ShieldCheck,
  Hash,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { fetchMemory, searchMemory, deleteMemory, VerificationMemoryRecord } from '../api/client.js';

export const MemoryPage: React.FC = () => {
  const [records, setRecords] = useState<VerificationMemoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<VerificationMemoryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = searchQuery.trim() ? await searchMemory(searchQuery) : await fetchMemory();
      setRecords(data);
      if (data.length > 0 && !selectedRecord) {
        setSelectedRecord(data[0]);
      }
    } catch (err) {
      console.error('Failed to load memory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this persistent verification memory record?')) return;
    try {
      await deleteMemory(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-magenta" />
            <span>Repository Verification Memory</span>
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Durable repository-specific memory of historical defects, confirmed counterexamples, and proven regression tests.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-brand-magenta/15 border border-white/10 hover:border-brand-magenta/30 text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand-magenta" />
          <span>Refresh Memory Bank</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-glass">
        <Search className="w-4 h-4 text-brand-magenta" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by defect pattern, counterexample input, or keyword..."
          className="w-full bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      {/* 2-Column Split: Records List & Detailed Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left List (5 Cols) */}
        <div className="md:col-span-5 rounded-xl overflow-hidden border border-white/10 bg-black/50 backdrop-blur-2xl shadow-glass flex flex-col">
          <div className="p-3 bg-black/60 border-b border-white/10 text-xs font-bold text-white/50 uppercase tracking-wider flex items-center justify-between">
            <span>Historical Memory Precedents ({records.length})</span>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-magenta" />
              <p className="text-xs">No verification memory matches found.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 overflow-y-auto max-h-[550px]">
              {records.map((rec) => {
                const isSelected = selectedRecord?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-brand-magenta/15 border-l-2 border-brand-magenta shadow-nebula-sm' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30 font-bold">
                        {rec.defectPattern}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">{rec.repositoryId}</span>
                    </div>

                    <h4 className="text-xs font-semibold text-white mt-1.5 line-clamp-1">{rec.bugDescription}</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{rec.rootCause}</p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                      <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                      <span className="text-status-pass font-bold">{rec.outcome}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail View (7 Cols) */}
        <div className="md:col-span-7 p-5 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-glass flex flex-col justify-between">
          {selectedRecord ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-brand-magenta/20 text-brand-magenta border border-brand-magenta/30 shadow-nebula-sm">
                      {selectedRecord.defectPattern}
                    </span>
                    <span className="text-[11px] font-mono text-white/40">ID: {selectedRecord.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1.5">{selectedRecord.bugDescription}</h3>
                </div>

                <button
                  onClick={() => handleDelete(selectedRecord.id)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-status-blocked hover:bg-status-blocked/15 transition-colors cursor-pointer"
                  title="Delete memory record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Root Cause Card */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Root Cause Hypothesis:</span>
                <p className="text-xs text-text-secondary leading-relaxed bg-black/60 p-3 rounded-lg border border-white/10">
                  {selectedRecord.rootCause}
                </p>
              </div>

              {/* Counterexample Evidence */}
              {selectedRecord.counterexampleInput && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-status-blocked flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Discovered Counterexample Vector:</span>
                  </span>
                  <pre className="text-xs font-mono text-brand-magenta bg-black/60 p-2.5 rounded-lg border border-white/10 overflow-x-auto">
                    {selectedRecord.counterexampleInput}
                  </pre>
                </div>
              )}

              {/* Effective Regression Test */}
              {selectedRecord.effectiveRegressionTest && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-status-pass flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Reused Regression Test Assertion:</span>
                  </span>
                  <pre className="text-xs font-mono text-white bg-black/60 p-2.5 rounded-lg border border-white/10 overflow-x-auto whitespace-pre-wrap">
                    {selectedRecord.effectiveRegressionTest}
                  </pre>
                </div>
              )}

              {/* Sealed Hash */}
              {selectedRecord.resolutionPatchHash && (
                <div className="p-3 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-white/50">
                    <Hash className="w-3.5 h-3.5 text-brand-magenta" />
                    <span>Resolution Patch SHA-256:</span>
                  </div>
                  <span className="text-white font-bold">{selectedRecord.resolutionPatchHash.substring(0, 16)}...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-text-muted my-auto">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-magenta" />
              <p className="text-xs">Select a memory record on the left to inspect historical evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
