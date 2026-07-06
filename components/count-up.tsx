"use client";

import { useRef, useEffect, useCallback } from "react";

/*
 * Shared count-up numeral (extracted from the gallery grid so every real
 * number on the site can tick up on reveal). Animated digits are hidden from
 * assistive tech; an sr-only span carries the real value. Respects
 * prefers-reduced-motion by jumping straight to the target.
 */
export function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (!spanRef.current || hasAnimated.current) return;
    hasAnimated.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spanRef.current.textContent = String(target);
      return;
    }

    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(easeOut(progress) * target);
      if (spanRef.current) spanRef.current.textContent = String(value);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [target, duration]);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <>
      <span ref={spanRef} aria-hidden="true">0</span>
      <span className="sr-only">{target}</span>
    </>
  );
}
