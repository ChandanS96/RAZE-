import React, { useState } from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';

interface InteractiveEnterButtonProps {
  onClick: () => void;
  className?: string;
  onHoverStateChange?: (isHovered: boolean) => void;
}

export const InteractiveEnterButton: React.FC<InteractiveEnterButtonProps> = ({
  onClick,
  className = '',
  onHoverStateChange
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: x * 10, y: y * 10 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverStateChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
    onHoverStateChange?.(false);
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer ambient energy ring */}
      <div
        className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
          isHovered
            ? 'w-48 h-48 bg-gradient-to-tr from-brand-neon/40 via-brand-magenta/30 to-brand-violet/40 blur-2xl scale-125'
            : 'w-36 h-36 bg-brand-neon/20 blur-xl scale-100'
        }`}
      />

      {/* Rotating dashed planetary border ring */}
      <div
        className={`absolute w-36 h-36 rounded-full border border-dashed border-brand-neon/40 pointer-events-none ${
          isHovered ? 'animate-spin-slow scale-110 border-brand-magenta/70' : 'animate-spin-slow opacity-60'
        }`}
      />

      {/* Counter-rotating subtle concentric ring */}
      <div
        className={`absolute w-44 h-44 rounded-full border border-brand-neon/20 pointer-events-none transition-all duration-500 ${
          isHovered ? 'animate-spin-reverse scale-105 border-brand-neon/40' : 'opacity-30'
        }`}
      />

      {/* Central Translucent Glowing Interactive Button */}
      <button
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`
        }}
        className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center text-center transition-all duration-300 backdrop-blur-xl border select-none group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-neon/80 ${
          isHovered
            ? 'bg-gradient-to-b from-white/25 via-brand-neon/30 to-brand-violet/40 border-white/60 shadow-[0_0_35px_rgba(232,121,249,0.5)] scale-105'
            : 'bg-white/10 hover:bg-white/15 border-white/20 shadow-[0_0_20px_rgba(155,92,255,0.25)]'
        }`}
        aria-label="Enter RAZE"
      >
        {/* Subtle pulsing inner light */}
        <div className="absolute inset-2 rounded-full bg-radial-gradient from-white/20 to-transparent pointer-events-none" />

        {/* Text stack */}
        <span className="font-extrabold text-sm tracking-widest text-white group-hover:text-brand-magenta transition-colors">
          ENTER
        </span>
        <span className="font-semibold text-[10px] tracking-widest text-text-secondary group-hover:text-white transition-colors uppercase">
          WORKSPACE
        </span>

        {/* Micro shine dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-brand-magenta mt-1 shadow-[0_0_8px_#E879F9] animate-pulse" />
      </button>
    </div>
  );
};
