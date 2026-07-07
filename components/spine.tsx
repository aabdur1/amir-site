"use client";

import { useEffect, useRef } from "react";

/*
 * Spine — the homepage's continuous vertical axis. A hairline runs the full
 * page height in the left margin (xl+ only, where the margin is wide enough
 * to never collide with content); a peach→mauve stroke draws down it as you
 * scroll, with a small peach "pen tip" marking the current position.
 * Replaces the old hero-only decorative line. RAF-gated ref mutations, no
 * re-renders. Reduced motion: rendered fully drawn, static.
 */
export function Spine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const draw = drawRef.current;
    const tip = tipRef.current;
    if (!container || !draw || !tip) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw.style.transform = "scaleY(1)";
      tip.style.opacity = "0";
      return;
    }

    const update = () => {
      rafRef.current = 0;
      const rect = container.getBoundingClientRect();
      const progress = Math.min(
        Math.max(((window.innerHeight - rect.top) / rect.height) * 1.02, 0),
        1
      );
      draw.style.transform = `scaleY(${progress})`;
      tip.style.transform = `translate(-50%, ${progress * rect.height}px)`;
      tip.style.opacity = progress > 0.002 && progress < 0.998 ? "1" : "0";
    };

    const onScroll = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute top-0 bottom-0 w-px hidden xl:block pointer-events-none z-[1]"
      style={{ left: "calc((100vw - 64rem) / 2 - 3rem)" }}
    >
      {/* Base hairline */}
      <div className="absolute inset-0 bg-cream-border/70 dark:bg-night-border/70" />
      {/* Drawn stroke — scaleY driven by scroll progress */}
      <div
        ref={drawRef}
        className="absolute inset-0 origin-top"
        style={{
          transform: "scaleY(0)",
          background:
            "linear-gradient(to bottom, var(--color-peach), var(--color-mauve) 45%, var(--color-lavender))",
          opacity: 0.6,
        }}
      />
      {/* Pen tip */}
      <div
        ref={tipRef}
        className="absolute top-0 left-1/2 w-[5px] h-[5px] rounded-full bg-peach dark:bg-peach-dark"
        style={{ transform: "translate(-50%, 0)", opacity: 0, transition: "opacity 0.3s ease" }}
      />
    </div>
  );
}
