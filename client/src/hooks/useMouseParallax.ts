import { useState, useEffect, useRef } from 'react';

export interface ParallaxState {
  // Normalized mouse coords (-1 to 1)
  normalizedX: number;
  normalizedY: number;
  
  // Multi-plane offsets with smooth lerp
  bgOffset: { x: number; y: number };
  entityOffset: {
    x: number;
    y: number;
    rotateX: number;
    rotateY: number;
    scale: number;
  };
  uiOffset: { x: number; y: number };
  glowOffset: { x: number; y: number };
  
  // Raw pixel coordinates
  pixel: { x: number; y: number };
  isHovered: boolean;
}

export function useMouseParallax(options = { lerpFactor: 0.08 }): ParallaxState {
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const mousePixel = useRef({ x: 0, y: 0 });
  const isHoveredRef = useRef(false);

  const [state, setState] = useState<ParallaxState>({
    normalizedX: 0,
    normalizedY: 0,
    bgOffset: { x: 0, y: 0 },
    entityOffset: { x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 },
    uiOffset: { x: 0, y: 0 },
    glowOffset: { x: 0, y: 0 },
    pixel: { x: 0, y: 0 },
    isHovered: false
  });

  useEffect(() => {
    // Center initially
    mousePixel.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    const handleMouseMove = (e: MouseEvent) => {
      isHoveredRef.current = true;
      mousePixel.current = { x: e.clientX, y: e.clientY };

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Normalize from -1 (left/top) to +1 (right/bottom)
      targetX.current = (e.clientX - centerX) / centerX;
      targetY.current = (e.clientY - centerY) / centerY;
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      targetX.current = 0;
      targetY.current = 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    let animationFrameId: number;

    const animate = () => {
      // Smooth linear interpolation (lerp)
      const factor = options.lerpFactor || 0.08;
      currentX.current += (targetX.current - currentX.current) * factor;
      currentY.current += (targetY.current - currentY.current) * factor;

      const nx = currentX.current;
      const ny = currentY.current;

      setState({
        normalizedX: nx,
        normalizedY: ny,
        // Background shifts in subtle opposition for depth
        bgOffset: {
          x: -nx * 14,
          y: -ny * 12
        },
        // Central hooded entity: moderate translation + subtle 3D tilt
        entityOffset: {
          x: nx * 22,
          y: ny * 16,
          rotateY: nx * 7,      // yaw
          rotateX: -ny * 5,     // pitch
          scale: 1 + Math.abs(nx * 0.02)
        },
        // Foreground UI elements: faster shift creating layered depth
        uiOffset: {
          x: nx * 10,
          y: ny * 8
        },
        // Core energy flare
        glowOffset: {
          x: nx * 35,
          y: ny * 25
        },
        pixel: { ...mousePixel.current },
        isHovered: isHoveredRef.current
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [options.lerpFactor]);

  return state;
}
