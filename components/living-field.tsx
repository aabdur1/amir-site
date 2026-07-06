"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * LivingField — the site-wide data field behind all content (both themes).
 * A single fixed canvas of plot-like points: most are dots, some are axis
 * ticks, a few carry faint mono value labels. On load the points assemble
 * from noise into a loose rising trend band; per-point scroll parallax
 * disperses the structure as you descend and reassembles it when you return.
 * Points drift slowly and lean away from a fine pointer.
 *
 * Perf: one canvas, ~28–90 points, 30fps cap, paused when the tab is hidden.
 * Reduced motion: a single static assembled frame, no RAF.
 * Route intensity: full on the homepage, medium on /learn, faint on /gallery
 * and inside artifact pages so it never fights photos or interactive canvases.
 */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type PointKind = "dot" | "tick" | "label";

interface FieldPoint {
  homeX: number;
  homeY: number;
  startX: number;
  startY: number;
  size: number;
  alpha: number;
  colorIndex: number;
  kind: PointKind;
  label?: string;
  depth: number; // scroll-parallax rate + drift scale
  phase: number; // drift phase offset
  speed: number; // drift speed
  assembleDelay: number; // ms
  assembleDur: number; // ms
  offsetX: number; // lerped cursor repel
  offsetY: number;
}

// Real numbers from around the site — inspection details, not noise
const LABELS = ["n = 56", "r² = 0.94", "η = 0.05", "n = 81", "k = 4"];

const LIGHT_COLORS = ["#209fb5", "#8839ef", "#fe640b", "#7287fd", "#dc8a78"];
const DARK_COLORS = ["#74c7ec", "#cba6f7", "#fab387", "#b4befe", "#f5e0dc"];

function routeProfile(pathname: string): { density: number; opacity: number } {
  if (pathname === "/") return { density: 1, opacity: 1 };
  if (pathname === "/learn") return { density: 0.7, opacity: 0.8 };
  return { density: 0.45, opacity: 0.55 }; // gallery, artifact pages, 404
}

function buildPoints(w: number, h: number, density: number): FieldPoint[] {
  const rand = seededRandom(1897);
  const count = Math.round(
    Math.max(24, Math.min(90, (w * h) / 26000)) * density
  );
  const points: FieldPoint[] = [];
  let labelsUsed = 0;

  for (let i = 0; i < count; i++) {
    const inBand = rand() < 0.44;
    let homeX: number, homeY: number;
    if (inBand) {
      // Loose rising trend band across the middle of the viewport
      const t = rand();
      homeX = (0.08 + t * 0.84) * w;
      homeY = (0.72 - t * 0.42) * h + (rand() - 0.5) * h * 0.12;
    } else {
      homeX = rand() * w;
      homeY = rand() * h;
    }

    const roll = rand();
    let kind: PointKind = "dot";
    if (roll > 0.94 && labelsUsed < 3) {
      kind = "label";
      labelsUsed++;
    } else if (roll > 0.85) {
      kind = "tick";
    }

    const angle = rand() * Math.PI * 2;
    const dist = 80 + rand() * 220;

    points.push({
      homeX,
      homeY,
      startX: homeX + Math.cos(angle) * dist,
      startY: homeY + Math.sin(angle) * dist,
      size: 1.4 + rand() * 2,
      alpha: inBand ? 0.38 + rand() * 0.24 : 0.16 + rand() * 0.2,
      colorIndex: Math.floor(rand() * 5),
      kind,
      label: kind === "label" ? LABELS[Math.floor(rand() * LABELS.length)] : undefined,
      depth: 0.2 + rand() * 0.6,
      phase: rand() * Math.PI * 2,
      speed: 0.00025 + rand() * 0.00035,
      assembleDelay: rand() * 700,
      assembleDur: 900 + rand() * 900,
      offsetX: 0,
      offsetY: 0,
    });
  }
  return points;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const REPEL_RADIUS = 140;
const REPEL_MAX = 14;
const FRAME_MS = 1000 / 30;

export function LivingField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const profile = routeProfile(pathname);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let points: FieldPoint[] = [];
    let W = 0, H = 0, dpr = 1;
    let rafId = 0;
    let running = false;
    let lastFrame = 0;
    let mounted = performance.now();
    const mouse = { x: -9999, y: -9999 };

    const isDark = () => document.documentElement.classList.contains("dark");

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      points = buildPoints(W, H, profile.density);
      mounted = performance.now();
    }

    function draw(now: number, assembled: boolean) {
      const dark = isDark();
      const colors = dark ? DARK_COLORS : LIGHT_COLORS;
      const alphaScale = profile.opacity;
      const scrollY = window.scrollY;

      ctx!.clearRect(0, 0, W, H);
      ctx!.font = '10px "Share Tech Mono", monospace';

      for (const p of points) {
        // Assembly progress (or final state for reduced motion / later frames)
        let t = 1;
        if (!assembled) {
          t = Math.min(Math.max((now - mounted - p.assembleDelay) / p.assembleDur, 0), 1);
          t = easeOutCubic(t);
        }

        const driftX = Math.sin(now * p.speed + p.phase) * 5 * p.depth;
        const driftY = Math.cos(now * p.speed * 0.8 + p.phase) * 4 * p.depth;

        const baseX = p.startX + (p.homeX - p.startX) * t;
        let y = p.startY + (p.homeY - p.startY) * t - scrollY * p.depth * 0.12;
        y = ((y % H) + H) % H; // wrap vertically for endless parallax

        // Cursor repel (lerped)
        let targetOX = 0, targetOY = 0;
        if (finePointer && mouse.x > -999) {
          const dx = baseX - mouse.x;
          const dy = y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < REPEL_RADIUS && d > 0.001) {
            const s = 1 - d / REPEL_RADIUS;
            targetOX = (dx / d) * REPEL_MAX * s;
            targetOY = (dy / d) * REPEL_MAX * s;
          }
        }
        p.offsetX += (targetOX - p.offsetX) * 0.08;
        p.offsetY += (targetOY - p.offsetY) * 0.08;

        const x = baseX + driftX + p.offsetX;
        const py = y + driftY + p.offsetY;
        const color = colors[p.colorIndex];
        const a = p.alpha * alphaScale * t;
        if (a <= 0.005) continue;

        ctx!.globalAlpha = a;
        ctx!.fillStyle = color;
        ctx!.strokeStyle = color;

        if (p.kind === "tick") {
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(x - 3, py);
          ctx!.lineTo(x + 3, py);
          ctx!.moveTo(x, py - 3);
          ctx!.lineTo(x, py + 3);
          ctx!.stroke();
        } else {
          if (dark) {
            // Soft halo in dark mode
            ctx!.globalAlpha = a * 0.35;
            ctx!.beginPath();
            ctx!.arc(x, py, p.size * 2.4, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.globalAlpha = a;
          }
          ctx!.beginPath();
          ctx!.arc(x, py, p.size, 0, Math.PI * 2);
          ctx!.fill();
          if (p.kind === "label" && p.label) {
            ctx!.globalAlpha = a * 0.8;
            ctx!.fillText(p.label, x + 6, py + 3);
          }
        }
      }
      ctx!.globalAlpha = 1;
    }

    function loop(now: number) {
      if (!running) return;
      if (now - lastFrame >= FRAME_MS) {
        lastFrame = now;
        draw(now, false);
      }
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduced) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    resize();
    if (reduced) {
      draw(performance.now(), true); // single static assembled frame
    } else {
      start();
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (reduced) draw(performance.now(), true);
      }, 200);
    };

    // Theme change: redraw the static frame under reduced motion; the live
    // loop picks the new palette up on its next frame automatically.
    const themeObserver = new MutationObserver(() => {
      if (reduced) draw(performance.now(), true);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    if (finePointer) window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      themeObserver.disconnect();
      if (finePointer) window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [pathname]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1, opacity: 0, animation: "fade-in 1.2s ease-out 0.3s forwards" }}
    />
  );
}
