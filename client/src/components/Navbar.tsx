import React from 'react';
import {
  ShieldCheck,
  Radio,
  Search,
  Sparkles,
  Lock,
  GitBranch
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenAssistant: () => void;
  sseConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, onOpenAssistant, sseConnected }) => {
  const getBreadcrumb = () => {
    if (currentPath === '/' || currentPath === '/workspace') return 'System Overview & Telemetry';
    if (currentPath === '/repositories') return 'Repository Ecosystem';
    if (currentPath === '/verify/new') return 'Launch Autonomous Verification';
    if (currentPath === '/runs') return 'Verification Runs History';
    if (currentPath.startsWith('/runs/')) return 'Live Verification Room';
    if (currentPath === '/memory') return 'Verification Memory & Test Bank';
    if (currentPath === '/settings') return 'Settings & Infrastructure Status';
    return 'RAZE';
  };

  return (
    <header className="h-14 bg-[#030206]/80 backdrop-blur-2xl border-b border-white/10 px-6 flex items-center justify-between z-20 shadow-md">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <span className="text-white/40">RAZE</span>
          <span className="text-white/30">/</span>
          <span className="gradient-text-magenta font-bold">{getBreadcrumb()}</span>
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-4">
        {/* SSE Live Event Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] backdrop-blur-md">
          <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-status-pass agent-running-pulse shadow-[0_0_8px_#10B981]' : 'bg-brand-magenta shadow-[0_0_8px_#FF2DF7]'}`}></span>
          <span className="text-text-secondary font-mono">{sseConnected ? 'SSE Live Stream' : 'Event Stream Ready'}</span>
        </div>

        {/* Security Sandbox Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-magenta/10 border border-brand-magenta/25 text-[11px] text-brand-magenta shadow-nebula-sm">
          <Lock className="w-3 h-3" />
          <span>Repair Shadow Sandbox</span>
        </div>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-brand-magenta/15 border border-brand-magenta/35 hover:border-brand-magenta/60 text-xs font-medium text-white transition-all shadow-nebula-sm cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-magenta" />
          <span>Ask Assistant</span>
        </button>
      </div>
    </header>
  );
};
