"use client";

import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const HEADSHOT_URL = "https://d36t8s1mzbufg5.cloudfront.net/_DSC4482.jpg";

/**
 * Headshot that reacts to cursor position — the cursor acts as a light source,
 * tilting the image toward the cursor and casting a shadow away from it.
 */
export function InteractiveHeadshot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);

  // Smoothed values (current) and target values
  const targetRef = useRef({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const currentRef = useRef({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animate = useCallback(() => {
    if (!activeRef.current) return;

    const lerp = 0.08;
    const c = currentRef.current;
    const t = targetRef.current;

    c.rotateX += (t.rotateX - c.rotateX) * lerp;
    c.rotateY += (t.rotateY - c.rotateY) * lerp;
    c.shadowX += (t.shadowX - c.shadowX) * lerp;
    c.shadowY += (t.shadowY - c.shadowY) * lerp;

    if (innerRef.current) {
      innerRef.current.style.transform =
        `perspective(800px) rotateX(${c.rotateX}deg) rotateY(${c.rotateY}deg)`;
    }

    // Dynamic shadow — cursor is the light, shadow falls opposite (gentle)
    const shadowDist = Math.sqrt(c.shadowX * c.shadowX + c.shadowY * c.shadowY);
    const shadowBlur = 16 + shadowDist * 0.5;
    const shadowSpread = 1 + shadowDist * 0.1;
    const shadowOpacity = 0.08 + shadowDist * 0.003;

    if (innerRef.current) {
      innerRef.current.style.boxShadow = [
        // Primary directional shadow (cursor = light source)
        `${c.shadowX * 0.6}px ${c.shadowY * 0.6}px ${shadowBlur * 0.4}px rgba(0,0,0,${shadowOpacity * 0.5})`,
        // Deep ambient shadow
        `${c.shadowX}px ${c.shadowY}px ${shadowBlur}px ${shadowSpread}px rgba(0,0,0,${shadowOpacity})`,
        // Soft diffuse shadow
        `${c.shadowX * 1.5}px ${c.shadowY * 1.5}px ${shadowBlur * 2}px rgba(0,0,0,${shadowOpacity * 0.4})`,
      ].join(", ");
    }

    // Glow shifts toward cursor (light spill)
    if (glowRef.current) {
      glowRef.current.style.transform =
        `translate(${-c.shadowX * 0.3}px, ${-c.shadowY * 0.3}px)`;
    }

    // Convergence check — stop RAF when values are close enough to target
    const dr = Math.abs(t.rotateX - c.rotateX) + Math.abs(t.rotateY - c.rotateY);
    const ds = Math.abs(t.shadowX - c.shadowX) + Math.abs(t.shadowY - c.shadowY);
    if (dr < 0.01 && ds < 0.01) {
      activeRef.current = false;
      rafRef.current = 0;
      return;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;

    const container = containerRef.current;
    if (!container) return;

    const section = container.closest("section");
    if (!section) return;

    // Cache getBoundingClientRect — avoid layout recalc on every mousemove
    function updateRect() {
      if (containerRef.current) {
        cachedRectRef.current = containerRef.current.getBoundingClientRect();
      }
    }
    updateRect();

    const ro = new ResizeObserver(updateRect);
    ro.observe(container);
    window.addEventListener("scroll", updateRect, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = cachedRectRef.current;
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalize -1 to 1 based on distance from headshot center
      // Use a larger range so the effect works across the whole hero
      const maxDist = 500;
      const dx = (e.clientX - centerX) / maxDist;
      const dy = (e.clientY - centerY) / maxDist;

      // Clamp to prevent extreme values
      const clampedX = Math.max(-1, Math.min(1, dx));
      const clampedY = Math.max(-1, Math.min(1, dy));

      // Tilt toward cursor (very subtle, max ~3 degrees)
      const maxTilt = 3;
      targetRef.current.rotateX = -clampedY * maxTilt;
      targetRef.current.rotateY = clampedX * maxTilt;

      // Shadow falls AWAY from cursor (opposite direction, gentle)
      const maxShadowOffset = 10;
      targetRef.current.shadowX = -clampedX * maxShadowOffset;
      targetRef.current.shadowY = -clampedY * maxShadowOffset;

      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      // Ease back to neutral — convergence check in animate() will stop the loop
      targetRef.current = { rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 };
      // Fallback timeout in case convergence takes too long
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = setTimeout(() => {
        activeRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        leaveTimerRef.current = null;
      }, 600);
    };

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", updateRect);
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div ref={containerRef} className="relative">
      {/* Registration marks — fixed print-style corner ticks; the plate tilts inside them */}
      <div aria-hidden="true" className="absolute -inset-4">
        <span className="reg-mark top-0 left-0 border-t border-l" />
        <span className="reg-mark top-0 right-0 border-t border-r" />
        <span className="reg-mark bottom-0 left-0 border-b border-l" />
        <span className="reg-mark bottom-0 right-0 border-b border-r" />
      </div>

      {/* The headshot with 3D tilt */}
      <div
        ref={innerRef}
        className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72 rounded-2xl overflow-hidden will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <Image
          src={HEADSHOT_URL}
          alt="Amir Abdur-Rahim"
          fill
          priority
          sizes="(max-width: 640px) 192px, (max-width: 1024px) 224px, 288px"
          className="object-cover"
        />
      </div>

      {/* Plate caption — ledger annotation under the figure */}
      <p className="annotation mt-5 text-center">
        fig. 00 &middot; Chicago &mdash; 41.88&deg; N
      </p>

      {/* Glow that shifts toward cursor */}
      <div
        ref={glowRef}
        className="absolute -inset-10 bg-lavender/8 dark:bg-lavender-dark/10 rounded-full blur-3xl -z-10 will-change-transform"
      />
    </div>
  );
}
