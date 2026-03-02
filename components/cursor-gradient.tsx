"use client";

import { useEffect, useRef } from "react";

export function CursorGradient() {
  const gradientRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  useEffect(() => {
    // Only activate on devices with a fine pointer (mouse)
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;

    const el = gradientRef.current;
    if (!el) return;

    // Make gradient visible
    el.style.opacity = "1";

    const parent = el.parentElement;
    if (!parent) return;

    function animate() {
      if (!activeRef.current || !gradientRef.current) return;

      // Lerp for smooth movement
      const lerp = 0.15;
      currentRef.current.x +=
        (positionRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y +=
        (positionRef.current.y - currentRef.current.y) * lerp;

      gradientRef.current.style.background = `radial-gradient(600px circle at ${currentRef.current.x}px ${currentRef.current.y}px, var(--cursor-gradient-color) 0%, transparent 100%)`;

      rafRef.current = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      positionRef.current.x = e.clientX - rect.left;
      positionRef.current.y = e.clientY - rect.top;

      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      activeRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (el) {
        el.style.background = "transparent";
      }
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      activeRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={gradientRef}
      className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300
        [--cursor-gradient-color:rgba(32,159,181,0.05)]
        dark:[--cursor-gradient-color:rgba(116,199,236,0.06)]"
      aria-hidden="true"
    />
  );
}
