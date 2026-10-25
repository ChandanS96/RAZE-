import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  FolderGit2,
  FileCode,
  Zap,
  Shield,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { fetchRepositories, createVerificationRun, Repository } from '../api/client.js';

interface NewVerificationPageProps {
  onNavigate: (path: string) => void;
}

export const NewVerificationPage: React.FC<NewVerificationPageProps> = ({ onNavigate }) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('repo-pricing-service');
  const [targetFile, setTargetFile] = useState('src/pricing.ts');
  const [bugTitle, setBugTitle] = useState('Defect #104: Boundary range failure & NaN underflow in calculateDiscount');
  const [bugDescription, setBugDescription] = useState('Negative discount values accepted in calculateDiscount, resulting in price inflation and negative customer invoice totals. Input lacks finite bounds checking.');
  const [maxRetries, setMaxRetries] = useState(3);
  const [trustCollapseDemo, setTrustCollapseDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRepositories().then(data => {
      setRepos(data);
      // Check URL query parameters if present
      const params = new URLSearchParams(window.location.search);
      const qRepo = params.get('repo');
      const qFile = params.get('file');
      if (qRepo) setSelectedRepoId(qRepo);
      if (qFile) setTargetFile(decodeURIComponent(qFile));
    }).catch(console.error);
  }, []);

  const handleRepoChange = (repoId: string) => {
    setSelectedRepoId(repoId);
    if (repoId === 'repo-pricing-service') {
      setTargetFile('src/pricing.ts');
      setBugTitle('Defect #104: Boundary range failure & NaN underflow in calculateDiscount');
      setBugDescription('Negative discount values accepted in calculateDiscount, resulting in price inflation and negative customer invoice totals. Input lacks finite bounds checking.');
    } else if (repoId === 'repo-auth-guardian') {
      setTargetFile('src/tokenValidator.ts');
      setBugTitle('Security Defect #209: Path Traversal Vulnerability in resolveTenantPath');
      setBugDescription('Tenant path resolution permits relative path sequences (../../etc/passwd) without canonical boundary prefix containment checks, exposing arbitrary system files.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const run = await createVerificationRun({
        repositoryId: selectedRepoId,
        targetFile,
        bugTitle,
        bugDescription,
        maxRetries,
        triggerTrustCollapseDemo: trustCollapseDemo
      });
      onNavigate(`/runs/${run.id}`);
    } catch (err: any) {
      alert(`Failed to launch verification run: ${err.message}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-brand-magenta" />
          <span>Launch Autonomous Verification Run</span>
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Configure target defect, adversarial challenge suite, and isolated repair shadow workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Repository Picker */}
        <div className="p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 space-y-3 shadow-glass">
          <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-brand-magenta" />
            <span>Select Target Repository</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {repos.map((repo) => {
              const isSelected = selectedRepoId === repo.id;
              return (
                <div
                  key={repo.id}
                  onClick={() => handleRepoChange(repo.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'glass-panel-glow border-brand-magenta/60 ring-1 ring-brand-magenta/40 shadow-nebula-sm'
                      : 'bg-black/40 border-white/10 hover:border-brand-magenta/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{repo.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30">
                      {repo.defaultBranch}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">{repo.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Defect Details */}
        <div className="p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 space-y-4 shadow-glass">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-brand-magenta" />
            <span>Target Defect Specification</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase font-mono font-semibold text-white/60 block mb-1">
                Target Source File
              </label>
              <input
                type="text"
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-magenta"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-mono font-semibold text-white/60 block mb-1">
                Bug Report Title
              </label>
              <input
                type="text"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-brand-magenta"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase font-mono font-semibold text-white/60 block mb-1">
                Defect Behavior & Error Description
              </label>
              <textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                rows={3}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white leading-relaxed focus:outline-none focus:border-brand-magenta"
              />
            </div>
          </div>
        </div>

        {/* Challenge Engine Modes */}
        <div className="p-5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 space-y-4 shadow-glass">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-magenta" />
            <span>Verification & Challenge Controls</span>
          </div>

          <div className="space-y-3">
            {/* Toggle: Trust Collapse Demonstration */}
            <div
              onClick={() => setTrustCollapseDemo(!trustCollapseDemo)}
              className="p-3.5 rounded-xl bg-black/60 border border-brand-magenta/30 flex items-start justify-between gap-4 cursor-pointer hover:border-brand-magenta/50 transition-colors shadow-nebula-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <span>Trust Collapse Loop (Signature Workflow)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-status-blocked/20 text-status-blocked font-bold">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Attempt 1 synthesizes a minimal fix that passes the reproduction test, but is falsified by the
                  Adversarial Hunter (150% discount). Unsupported trust collapses, triggering Attempt 2 with full
                  boundary hardening.
                </p>
              </div>
              <input
                type="checkbox"
                checked={trustCollapseDemo}
                onChange={() => {}}
                className="mt-1 w-4 h-4 rounded text-brand-magenta focus:ring-brand-magenta bg-black/60 accent-brand-magenta"
              />
            </div>

            {/* Max Retries Slider */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-white">Bounded Repair Retries</div>
                <div className="text-[11px] text-text-muted">Maximum autonomous iteration cycles before requesting human intervention</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value, 10))}
                  className="w-24 accent-brand-magenta cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-brand-magenta w-6 text-center">{maxRetries}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-brand-neon via-brand-violet to-brand-magenta hover:opacity-95 text-white text-xs font-extrabold shadow-xl shadow-brand-magenta/25 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{submitting ? 'Initializing Isolated Shadow Workspace...' : 'Start Autonomous Verification Run'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
