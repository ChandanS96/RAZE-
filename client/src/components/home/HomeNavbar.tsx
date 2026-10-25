import React from 'react';
import { Shield, Sparkles, Terminal, ArrowRight } from 'lucide-react';

interface HomeNavbarProps {
  onNavigate: (path: string) => void;
  onEnterWorkspace: () => void;
}

export const HomeNavbar: React.FC<HomeNavbarProps> = ({ onNavigate, onEnterWorkspace }) => {
  return (
    <header className="absolute top-0 inset-x-0 h-20 px-6 sm:px-12 flex items-center justify-between z-30 select-none">
      {/* Brand Logo */}
      <div
        onClick={() => onNavigate('/')}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-neon to-brand-violet flex items-center justify-center text-white shadow-lg shadow-brand-neon/25 group-hover:scale-105 transition-transform">
          <Shield className="w-5 h-5 fill-current" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold tracking-widest text-base text-white group-hover:text-brand-magenta transition-colors">
            RAZE
          </span>
          <span className="text-[9px] tracking-wider text-text-muted font-mono uppercase">
            Autonomous Ecosystem
          </span>
        </div>
      </div>

      {/* Center Navigation Links */}
      <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-text-secondary">
        <button
          onClick={() => {
            const el = document.getElementById('experience-hero');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="hover:text-white transition-colors"
        >
          Overview
        </button>
        <button
          onClick={() => {
            const el = document.getElementById('beyond-ordinary');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="hover:text-white transition-colors"
        >
          Capabilities
        </button>
        <button
          onClick={() => onNavigate('/repositories')}
          className="hover:text-white transition-colors"
        >
          Repositories
        </button>
        <button
          onClick={() => onNavigate('/memory')}
          className="hover:text-white transition-colors"
        >
          Memory Bank
        </button>
      </nav>

      {/* Right Launch CTA */}
      <div className="flex items-center gap-3">
        <button
          onClick={onEnterWorkspace}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-neon to-brand-violet hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand-neon/25 border border-brand-neon/40 transition-all cursor-pointer group"
        >
          <span>Workspace</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
};
