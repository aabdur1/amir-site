"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

const emptySubscribe = () => () => {};

export function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/*
 * Magnetic hover — element subtly pulls toward the cursor (~2px peak; MAX = 4 is a hard clamp the pull math never reaches).
 * Promoted from nav.tsx so hero CTAs and future interactive pills share it.
 * RAF + lerp with convergence check; gated behind (pointer: fine).
 */
export function useMagnetic(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    const state = { rafId: null as number | null };
    const MAX = 4; // max displacement in px
    const LERP = 0.15;

    const animate = () => {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      el.style.transform = `translate(${currentX}px, ${currentY}px)`;

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        state.rafId = requestAnimationFrame(animate);
      } else {
        el.style.transform = `translate(${targetX}px, ${targetY}px)`;
        state.rafId = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(rect.width, rect.height);
      const factor = Math.max(0, 1 - dist / maxDist);
      targetX = Math.max(-MAX, Math.min(MAX, dx * factor * (MAX / maxDist * 2)));
      targetY = Math.max(-MAX, Math.min(MAX, dy * factor * (MAX / maxDist * 2)));
      if (!state.rafId) state.rafId = requestAnimationFrame(animate);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!state.rafId) state.rafId = requestAnimationFrame(animate);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (state.rafId) cancelAnimationFrame(state.rafId);
      el.style.transform = "";
    };
  }, [ref]);
}

export function useScrollReveal(threshold = 0.1): [RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}
