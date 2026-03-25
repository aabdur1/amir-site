"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [isScrollable, setIsScrollable] = useState(false);

  const cssScrollSupported = typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()');

  useEffect(() => {
    // Only show on pages that are scrollable (>2x viewport height)
    const checkScrollable = () => {
      setIsScrollable(document.documentElement.scrollHeight > window.innerHeight * 2);
    };

    checkScrollable();

    const observer = new ResizeObserver(checkScrollable);
    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isScrollable) return;

    if (cssScrollSupported) {
      // CSS handles the progress animation — fade in after first scroll
      const onScroll = () => {
        if (barRef.current && window.scrollY > 5) {
          barRef.current.style.opacity = '1'
          window.removeEventListener('scroll', onScroll)
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    } else {
      // Existing JS scroll listener code
      const updateProgress = () => {
        if (!barRef.current) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        barRef.current.style.transform = `scaleX(${progress})`;
        // Fade in after user starts scrolling
        barRef.current.style.opacity = scrollTop > 5 ? "1" : "0";
        rafRef.current = 0;
      };

      const handleScroll = () => {
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(updateProgress);
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      updateProgress();

      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [isScrollable, cssScrollSupported]);

  if (!isScrollable) return null;

  return (
    <div
      ref={barRef}
      className={`fixed top-0 left-0 right-0 h-0.5 bg-mauve dark:bg-mauve-dark z-50 origin-left ${cssScrollSupported ? 'scroll-progress-css' : ''}`}
      style={{ transform: "scaleX(0)", opacity: 0, transition: "opacity 0.3s ease" }}
      aria-hidden="true"
    />
  );
}
