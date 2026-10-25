import React, { useState } from 'react';

interface CentralHoodedFigureProps {
  imageSrc?: string;
  entityOffset: {
    x: number;
    y: number;
    rotateX: number;
    rotateY: number;
    scale: number;
  };
  glowOffset?: {
    x: number;
    y: number;
  };
  isInteracting?: boolean;
}

export const CentralHoodedFigure: React.FC<CentralHoodedFigureProps> = ({
  imageSrc = '/assets/hooded-figure.jpg',
  entityOffset,
  glowOffset = { x: 0, y: 0 },
  isInteracting = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* 1. Underlying Volumetric Nebula Core Glow (inside & behind the cowl) */}
      <div
        className="absolute w-[360px] sm:w-[480px] h-[360px] sm:h-[480px] rounded-full pointer-events-none transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${glowOffset.x * 1.2}px, ${glowOffset.y * 1.2}px, -40px)`,
          background: 'radial-gradient(circle, rgba(255,45,247,0.38) 0%, rgba(155,92,255,0.22) 35%, rgba(2,2,4,0) 70%)',
          filter: 'blur(35px)',
          opacity: isInteracting ? 0.95 : 0.75
        }}
      />

      {/* 2. Secondary High-Frequency Energy Core Pulse */}
      <div
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none animate-pulse"
        style={{
          transform: `translate(-50%, -50%) translate3d(${glowOffset.x * 1.5}px, ${glowOffset.y * 1.5}px, 20px)`,
          background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,45,247,0.85) 25%, rgba(155,92,255,0.4) 55%, transparent 75%)',
          filter: 'blur(16px)',
          mixBlendMode: 'screen'
        }}
      />

      {/* 3. The Hooded Figure Container with 3D Parallax Tilt & Breathing Float */}
      <div
        className="relative z-10 transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(${entityOffset.x}px, ${entityOffset.y}px, 0px) rotateX(${entityOffset.rotateX}deg) rotateY(${entityOffset.rotateY}deg) scale(${entityOffset.scale})`,
          willChange: 'transform'
        }}
      >
        {/* Soft Feathered Mask Layer */}
        <div
          className="relative max-w-[340px] sm:max-w-[460px] md:max-w-[540px] aspect-[4/5] flex items-center justify-center overflow-hidden"
          style={{
            // Radial & elliptical gradient mask for edge feathering into deep space black
            maskImage: 'radial-gradient(ellipse 65% 72% at 50% 48%, black 35%, rgba(0,0,0,0.85) 55%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse 65% 72% at 50% 48%, black 35%, rgba(0,0,0,0.85) 55%, transparent 78%)',
            filter: 'drop-shadow(0 0 35px rgba(255, 45, 247, 0.35)) drop-shadow(0 0 85px rgba(155, 92, 255, 0.2))'
          }}
        >
          {!hasError ? (
            <img
              src={imageSrc}
              alt="RAZE Celestial Hooded Entity"
              onLoad={() => setImageLoaded(true)}
              onError={() => setHasError(true)}
              className={`w-full h-full object-cover object-center transition-opacity duration-700 ${
                imageLoaded ? 'opacity-95' : 'opacity-0'
              }`}
              style={{
                filter: 'contrast(1.08) brightness(1.02)'
              }}
            />
          ) : (
            // Fallback decorative silhouette if image path is unavailable
            <div className="w-full h-full bg-gradient-to-b from-[#120824] via-[#05020c] to-[#020204] flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-brand-magenta/30 blur-2xl animate-pulse" />
            </div>
          )}

          {/* Vignette Gradients on edges to guarantee 100% seamless blending */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020204] via-transparent to-[#020204]/70 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020204] via-transparent to-[#020204] pointer-events-none opacity-80" />
        </div>

        {/* 4. Ambient Stardust Sparkles floating directly in front of the cowl */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[35%] left-[45%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-ping" />
          <div className="absolute top-[42%] left-[53%] w-1 h-1 rounded-full bg-brand-magenta shadow-[0_0_6px_#ff2df7] animate-pulse" />
          <div className="absolute top-[32%] left-[48%] w-1.5 h-1.5 rounded-full bg-brand-neon shadow-[0_0_8px_#9b5cff] animate-pulse" />
        </div>
      </div>

      {/* 5. Subtle Ground Reflection Sheen */}
      <div
        className="absolute bottom-[-15%] w-[80%] h-16 rounded-full pointer-events-none opacity-40 blur-xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,45,247,0.3) 0%, rgba(155,92,255,0.1) 45%, transparent 70%)',
          transform: `translate3d(${entityOffset.x * 0.4}px, 0, 0)`
        }}
      />
    </div>
  );
};
