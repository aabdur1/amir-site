"use client";

import { useEffect, useRef, useMemo, useSyncExternalStore } from "react";

const ACCENT_COLORS = [
  "var(--color-mauve-dark)",
  "var(--color-sapphire-dark)",
  "var(--color-peach-dark)",
  "var(--color-lavender-dark)",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface DotConfig {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  colorIndex: number;
}

interface DotState {
  currentDriftX: number;
  currentDriftY: number;
  currentOpacity: number;
}

function generateDots(count: number): DotConfig[] {
  const rand = seededRandom(42);
  const dots: DotConfig[] = [];

  for (let i = 0; i < count; i++) {
    dots.push({
      x: rand() * 100,
      y: rand() * 100,
      size: 1 + rand() * 2,
      baseOpacity: 0.2 + rand() * 0.15,
      colorIndex: i % ACCENT_COLORS.length,
    });
  }

  return dots;
}

const DOT_COUNT_MIN = 40;
const DOT_COUNT_MAX = 250;
const DOT_COUNT_REF = 150; // reference count at 1920px width

function getDotCount(width: number): number {
  return Math.max(DOT_COUNT_MIN, Math.min(DOT_COUNT_MAX,
    Math.round((width / 1920) * DOT_COUNT_REF)));
}

const INTERACTION_RADIUS = 150;
const MAX_DRIFT = 6;
const GLOW_OPACITY = 0.55;
const LERP = 0.06;

const noopSubscribe = () => () => {};

export function HeroSpeckles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const statesRef = useRef<DotState[]>([]);
  const dotElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const activeRef = useRef(false);
  const rafRef = useRef<number>(0);

  // Viewport-proportional dot count — 0 on server, measured on client
  const dotCount = useSyncExternalStore(
    noopSubscribe,
    () => getDotCount(window.innerWidth),
    () => 0,
  );

  const dotConfigs = useMemo(() => generateDots(dotCount), [dotCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasFinePointer || prefersReducedMotion) return;

    const parent = container.parentElement;
    if (!parent) return;

    // Initialize dot states
    statesRef.current = dotConfigs.map((config) => ({
      currentDriftX: 0,
      currentDriftY: 0,
      currentOpacity: config.baseOpacity,
    }));

    function animate() {
      if (!activeRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      let allConverged = true;

      dotConfigs.forEach((config, i) => {
        const el = dotElsRef.current[i];
        const state = statesRef.current[i];
        if (!el || !state) return;

        const dotCenterX = (config.x / 100) * rect.width;
        const dotCenterY = (config.y / 100) * rect.height;
        const dx = dotCenterX - mx;
        const dy = dotCenterY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetDriftX = 0;
        let targetDriftY = 0;
        let targetOpacity = config.baseOpacity;

        if (dist < INTERACTION_RADIUS && mx > -500) {
          const strength = 1 - dist / INTERACTION_RADIUS;
          const angle = Math.atan2(dy, dx);
          targetDriftX = Math.cos(angle) * MAX_DRIFT * strength;
          targetDriftY = Math.sin(angle) * MAX_DRIFT * strength;
          targetOpacity = config.baseOpacity + (GLOW_OPACITY - config.baseOpacity) * strength;
        }

        state.currentDriftX += (targetDriftX - state.currentDriftX) * LERP;
        state.currentDriftY += (targetDriftY - state.currentDriftY) * LERP;
        state.currentOpacity += (targetOpacity - state.currentOpacity) * LERP;

        el.style.transform = `translate(${state.currentDriftX}px, ${state.currentDriftY}px)`;
        el.style.opacity = String(state.currentOpacity);

        if (
          Math.abs(targetDriftX - state.currentDriftX) > 0.1 ||
          Math.abs(targetDriftY - state.currentDriftY) > 0.1 ||
          Math.abs(targetOpacity - state.currentOpacity) > 0.005
        ) {
          allConverged = false;
        }
      });

      if (allConverged) {
        activeRef.current = false;
        rafRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;

      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dotConfigs]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden hidden dark:block"
      aria-hidden="true"
      style={{
        opacity: 0,
        animation: "fade-in 1s ease-out 1s forwards",
      }}
    >
      {dotConfigs.map((dot, i) => (
        <div
          key={i}
          ref={(el) => { dotElsRef.current[i] = el; }}
          className="absolute rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            opacity: dot.baseOpacity,
            backgroundColor: ACCENT_COLORS[dot.colorIndex],
          }}
        />
      ))}
    </div>
  );
}
