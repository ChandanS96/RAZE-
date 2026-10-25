import React from 'react';
import {
  Search,
  Wrench,
  Crosshair,
  Gauge,
  Scale,
  ShieldAlert,
  ArrowRight,
  Zap,
  Play,
  Brain,
  Lock,
  GitBranch
} from 'lucide-react';

interface BeyondSectionProps {
  onNavigate: (path: string) => void;
}

export const BeyondTheOrdinarySection: React.FC<BeyondSectionProps> = ({ onNavigate }) => {
  const capabilities = [
    {
      num: '01',
      title: 'Investigate',
      tagline: 'Autonomous Root-Cause Hypothesis',
      desc: 'Inspects codebases, identifies affected symbols, queries historical verification memory, and reproduces baseline failures with real executable tests.',
      icon: Search,
      color: 'text-brand-neon'
    },
    {
      num: '02',
      title: 'Repair',
      tagline: 'Bounded Minimal Patching & Shadow Sandbox',
      desc: 'Synthesizes minimal reviewable Git patches without refactoring bloat. Clones isolated ephemeral shadow workspaces and verifies SHA-256 cryptographic hashes.',
      icon: Wrench,
      color: 'text-brand-magenta'
    },
    {
      num: '03',
      title: 'Challenge',
      tagline: 'Adversarial Counterexample Hunter',
      desc: 'Actively searches for evidence to falsify fixes. Generates boundary inputs (150% discounts, negative prices, NaN) and collapses unsupported trust.',
      icon: Crosshair,
      color: 'text-status-blocked'
    },
    {
      num: '04',
      title: 'Test',
      tagline: 'Mutation-Based Test Trust Analysis',
      desc: 'Introduces synthetic AST code mutations to challenge test sensitivity. Measures exact Killed vs. Survived mutants and calculates test suite integrity score.',
      icon: Gauge,
      color: 'text-brand-cyan'
    },
    {
      num: '05',
      title: 'Verify',
      tagline: 'Deterministic Release Gate & Memory',
      desc: 'Evaluates accumulated evidence against deterministic policy rules. Seals verified patch hashes into persistent memory for human developer review.',
      icon: Scale,
      color: 'text-status-pass'
    }
  ];

  return (
    <section id="beyond-ordinary" className="relative py-24 px-6 sm:px-12 bg-[#020204] border-t border-white/10 select-none overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-magenta/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-magenta/15 border border-brand-magenta/35 text-brand-magenta text-xs font-mono font-semibold tracking-wider uppercase shadow-nebula-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous AI Engineering Platform</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white uppercase">
            Beyond the Ordinary.
          </h2>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            An evolving digital experience built around intelligence, experimentation, and engineering.
            Traditional tools generate code; <strong className="text-white">RAZE</strong> challenges its own fixes,
            falsifies weak assumptions, and guarantees reproducible evidence before a human accepts a patch.
          </p>
        </div>

        {/* 5 Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.num}
                className="p-6 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 hover:border-brand-magenta/50 transition-all group flex flex-col justify-between shadow-glass"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white/40 group-hover:text-brand-magenta transition-colors">
                      {cap.num}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Icon className={`w-5 h-5 ${cap.color}`} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-magenta transition-colors">
                      {cap.title}
                    </h3>
                    <div className="text-[11px] font-mono text-white/50 mt-0.5">{cap.tagline}</div>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed font-sans">{cap.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/40 group-hover:text-white transition-colors">
                  <span>Empirical Engine</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}

          {/* 6th Tile: Quick Launch into Live Room */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-violet/25 via-black/60 to-black/80 backdrop-blur-2xl border border-brand-magenta/40 shadow-nebula-md flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-magenta font-bold">
                Live Demonstration
              </span>
              <h3 className="text-lg font-extrabold text-white leading-tight">
                Inspect Real Defect #104 in Shadow Mode
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Experience the 7-stage Trust Collapse loop live against the bundled pricing calculation engine.
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <button
                onClick={() => onNavigate('/verify/new')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-neon to-brand-magenta hover:opacity-95 text-white text-xs font-bold transition-all shadow-lg shadow-brand-magenta/25 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch New Verification</span>
              </button>

              <button
                onClick={() => onNavigate('/runs')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-black/60 hover:bg-white/[0.05] text-text-secondary hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
              >
                <span>View Trajectory History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Brand Seal */}
        <div className="pt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-pass" />
            <span>RAZE Autonomous Ecosystem • Version 1.0.0</span>
          </div>
          <div>Proving whether code is safe to ship before human approval.</div>
        </div>
      </div>
    </section>
  );
};
