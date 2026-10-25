import React from 'react';

interface RazeWordmarkProps {
  className?: string;
  glow?: boolean;
}

export const RazeWordmark: React.FC<RazeWordmarkProps> = ({ className = '', glow = true }) => {
  return (
    <div className={`relative w-full flex items-center justify-center select-none ${className}`}>
      {/* Background ambient ethereal glow */}
      {glow && (
        <div className="absolute w-3/4 max-w-lg h-24 bg-gradient-to-r from-brand-magenta/30 via-brand-neon/25 to-brand-magenta/30 blur-3xl rounded-full scale-110 pointer-events-none -z-10 animate-pulse" />
      )}

      <svg
        viewBox="0 0 520 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-[460px] sm:max-w-[540px] md:max-w-[600px] mx-auto filter drop-shadow-[0_0_24px_rgba(255,45,247,0.45)] drop-shadow-[0_0_55px_rgba(155,92,255,0.25)]"
        aria-label="RAZE"
      >
        {/* ============================================================== */}
        {/* LETTER 'R'                                                     */}
        {/* Curved outer loop, vertical stem, leg, central circular orb    */}
        {/* ============================================================== */}
        <g stroke="#F8F5FF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          {/* Vertical stem */}
          <path d="M 30 100 L 30 20" />
          {/* Upper loop */}
          <path d="M 30 20 C 65 20, 85 28, 85 52 C 85 76, 65 84, 30 84" />
          {/* Diagonal leg */}
          <path d="M 60 84 L 92 100" />
        </g>
        {/* Floating cosmic orb inside R */}
        <circle cx="56" cy="52" r="8" fill="#F8F5FF" />
        <circle cx="56" cy="52" r="14" stroke="#9B5CFF" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />

        {/* ============================================================== */}
        {/* LETTER 'A'                                                     */}
        {/* Triangular arch with floating luminous core dot                 */}
        {/* ============================================================== */}
        <g stroke="#F8F5FF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          {/* Left leg */}
          <path d="M 140 100 L 175 20" />
          {/* Right leg */}
          <path d="M 175 20 L 210 100" />
        </g>
        {/* Floating cosmic orb inside A */}
        <circle cx="175" cy="62" r="8" fill="#F8F5FF" />
        <circle cx="175" cy="62" r="14" stroke="#E879F9" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />

        {/* ============================================================== */}
        {/* LETTER 'Z'                                                     */}
        {/* Angular futuristic glyph with centered dot                     */}
        {/* ============================================================== */}
        <g stroke="#F8F5FF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          {/* Top horizontal */}
          <path d="M 260 26 L 330 26" />
          {/* Diagonal */}
          <path d="M 330 26 L 260 94" />
          {/* Bottom horizontal */}
          <path d="M 260 94 L 330 94" />
        </g>
        {/* Floating cosmic orb inside Z */}
        <circle cx="295" cy="60" r="8" fill="#F8F5FF" />
        <circle cx="295" cy="60" r="14" stroke="#9B5CFF" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />

        {/* ============================================================== */}
        {/* LETTER 'E'                                                     */}
        {/* Futuristic curved glyph with center aperture dot               */}
        {/* ============================================================== */}
        <g stroke="#F8F5FF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
          {/* Arc loop */}
          <path d="M 450 30 C 395 20, 380 45, 380 60 C 380 75, 395 100, 450 90" />
        </g>
        {/* Center floating core dot */}
        <circle cx="415" cy="60" r="8" fill="#F8F5FF" />
        <circle cx="415" cy="60" r="14" stroke="#E879F9" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />
      </svg>
    </div>
  );
};
