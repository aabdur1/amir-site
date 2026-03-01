"use client";

import { useEffect, useRef, useCallback } from "react";

const HEADSHOT_URL = "https://d36t8s1mzbufg5.cloudfront.net/_DSC4482.jpg";

/**
 * Headshot that reacts to cursor position — the cursor acts as a light source,
 * tilting the image toward the cursor and casting a shadow away from it.
 */
export function InteractiveHeadshot() {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const borderOuterRef = useRef<HTMLDivElement>(null);
  const borderInnerRef = useRef<HTMLDivElement>(null);

  // Smoothed values (current) and target values
  const targetRef = useRef({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const currentRef = useRef({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

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

    // Decorative borders tilt slightly less (parallax depth)
    if (borderOuterRef.current) {
      borderOuterRef.current.style.transform =
        `translate(12px, 12px) perspective(800px) rotateX(${c.rotateX * 0.5}deg) rotateY(${c.rotateY * 0.5}deg)`;
    }
    if (borderInnerRef.current) {
      borderInnerRef.current.style.transform =
        `translate(4px, 4px) perspective(800px) rotateX(${c.rotateX * 0.7}deg) rotateY(${c.rotateY * 0.7}deg)`;
    }

    // Glow shifts toward cursor (light spill)
    if (glowRef.current) {
      glowRef.current.style.transform =
        `translate(${-c.shadowX * 0.3}px, ${-c.shadowY * 0.3}px)`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;

    const section = containerRef.current?.closest("section");
    if (!section) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
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
      // Ease back to neutral
      targetRef.current = { rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 };
      // Keep animating so it smoothly returns
      setTimeout(() => {
        activeRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      }, 600);
    };

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseleave", handleMouseLeave);
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div ref={containerRef} className="relative">
      {/* Decorative offset border — outer */}
      <div
        ref={borderOuterRef}
        className="absolute -inset-3 border border-forest/20 dark:border-green-light/20 rounded-2xl translate-x-3 translate-y-3 transition-transform duration-100"
      />
      {/* Decorative offset border — inner */}
      <div
        ref={borderInnerRef}
        className="absolute -inset-1.5 border border-forest/10 dark:border-green-light/10 rounded-2xl translate-x-1 translate-y-1 transition-transform duration-100"
      />

      {/* The headshot with 3D tilt */}
      <div
        ref={innerRef}
        className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72 rounded-2xl overflow-hidden will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <img
          src={HEADSHOT_URL}
          alt="Amir Abdur-Rahim"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Glow that shifts toward cursor */}
      <div
        ref={glowRef}
        className="absolute -inset-10 bg-green-light/6 dark:bg-green-light/10 rounded-full blur-3xl -z-10 will-change-transform"
      />
    </div>
  );
}
