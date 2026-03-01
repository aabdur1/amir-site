"use client";

import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { AnimatedText } from "@/components/animated-text";
import { CursorGradient } from "@/components/cursor-gradient";

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

const HEADSHOT_URL = "https://d36t8s1mzbufg5.cloudfront.net/_DSC4482.jpg";

const badges = [
  "1st Place — AWS National Cloud Quest",
  "Zscaler Zero Trust Architect",
  "MS in MIS — UIC '26",
  "AWS Cloud Security Builder",
];

export function Hero() {
  const mounted = useHydrated();
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isInViewRef = useRef(true);

  const updateParallax = useCallback(() => {
    if (!contentRef.current || !isInViewRef.current) return;
    const offset = window.scrollY * 0.3;
    contentRef.current.style.transform = `translateY(-${offset}px)`;
    rafRef.current = 0;
  }, []);

  const handleScroll = useCallback(() => {
    if (sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      isInViewRef.current = rect.bottom > 0;
    }
    if (!isInViewRef.current) return;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updateParallax);
    }
  }, [updateParallax]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-screen flex items-center justify-center"
    >
      <CursorGradient />

      {/* Decorative vertical line — left side accent */}
      <div
        className="absolute left-8 sm:left-12 lg:left-20 top-0 bottom-0 w-px bg-parchment-border dark:bg-night-border"
        style={{
          opacity: 0,
          ...(mounted ? { animation: "fade-in 1.2s ease-out 0.3s forwards" } : {}),
        }}
      />

      <div
        ref={contentRef}
        className="relative w-full max-w-6xl mx-auto px-6 sm:px-12 lg:px-20 py-24 will-change-transform"
      >
        {/* Main content grid — asymmetric layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center">

          {/* Left column: text content */}
          <div className="order-2 lg:order-1">
            {/* Small label above name */}
            <p
              className="text-xs tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
                text-forest/60 dark:text-green-light/60 mb-4 sm:mb-6"
              style={{
                opacity: 0,
                ...(mounted ? { animation: "fade-in-up 0.6s ease-out 0.1s forwards" } : {}),
              }}
            >
              Software &middot; Healthcare &middot; Photography
            </p>

            {/* Name — massive */}
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight
                text-forest dark:text-night-text font-[family-name:var(--font-display)]"
            >
              <AnimatedText text="Amir Abdur-Rahim" />
            </h1>

            {/* Decorative horizontal rule */}
            <div
              className="mt-6 sm:mt-8 h-px w-24 bg-forest dark:bg-green-light"
              style={{
                opacity: 0,
                ...(mounted ? { animation: "fade-in 0.8s ease-out 0.6s forwards" } : {}),
              }}
            />

            {/* Tagline */}
            <p
              className="text-lg sm:text-xl md:text-2xl mt-5 sm:mt-6 max-w-md
                text-slate-muted dark:text-night-muted leading-relaxed"
              style={{
                opacity: 0,
                ...(mounted ? { animation: "fade-in-up 0.6s ease-out 0.8s forwards" } : {}),
              }}
            >
              Healthcare meets technology.{" "}
              <span className="text-forest dark:text-green-light">Chicago.</span>
            </p>

            {/* Social links */}
            <div className="flex gap-1 items-center mt-8">
              <a
                href="https://github.com/aabdur1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex items-center justify-center w-11 h-11 rounded-full
                  text-slate-muted dark:text-night-muted
                  hover:text-forest hover:bg-forest/5 dark:hover:text-green-light dark:hover:bg-green-light/5
                  transition-all duration-200"
                style={{
                  opacity: 0,
                  ...(mounted ? { animation: "fade-in-up 0.5s ease-out 1.1s forwards" } : {}),
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/amir-abdur-rahim/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex items-center justify-center w-11 h-11 rounded-full
                  text-slate-muted dark:text-night-muted
                  hover:text-forest hover:bg-forest/5 dark:hover:text-green-light dark:hover:bg-green-light/5
                  transition-all duration-200"
                style={{
                  opacity: 0,
                  ...(mounted ? { animation: "fade-in-up 0.5s ease-out 1.25s forwards" } : {}),
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="mailto:amirabdurrahim@gmail.com"
                aria-label="Email"
                className="flex items-center justify-center w-11 h-11 rounded-full
                  text-slate-muted dark:text-night-muted
                  hover:text-forest hover:bg-forest/5 dark:hover:text-green-light dark:hover:bg-green-light/5
                  transition-all duration-200"
                style={{
                  opacity: 0,
                  ...(mounted ? { animation: "fade-in-up 0.5s ease-out 1.4s forwards" } : {}),
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
              </a>
            </div>

            {/* Badges — inside the hero, visible without scrolling */}
            <div className="flex flex-wrap gap-2.5 mt-10">
              {badges.map((badge, i) => (
                <span
                  key={badge}
                  className="rounded-full px-4 py-2
                    bg-forest/8 dark:bg-green-light/8
                    border border-parchment-border dark:border-night-border
                    text-xs font-[family-name:var(--font-mono)]
                    text-forest/80 dark:text-green-light/80
                    hover:-translate-y-0.5 hover:shadow-card hover:text-forest dark:hover:text-green-light
                    transition-all duration-300"
                  style={{
                    opacity: 0,
                    ...(mounted
                      ? {
                          animation: "fade-in-up 0.5s ease-out forwards",
                          animationDelay: `${1600 + i * 100}ms`,
                        }
                      : {}),
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Right column: headshot */}
          <div
            className="order-1 lg:order-2 flex justify-center lg:justify-end"
            style={{
              opacity: 0,
              ...(mounted ? { animation: "fade-in 1s ease-out 0.3s forwards" } : {}),
            }}
          >
            <div className="relative">
              {/* Decorative offset border */}
              <div className="absolute -inset-3 border border-forest/20 dark:border-green-light/20 rounded-2xl translate-x-2 translate-y-2" />
              <img
                src={HEADSHOT_URL}
                alt="Amir Abdur-Rahim"
                className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72
                  object-cover rounded-2xl shadow-card"
              />
              {/* Subtle green glow behind the image */}
              <div className="absolute -inset-8 bg-green-light/5 dark:bg-green-light/8 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          opacity: 0,
          ...(mounted ? { animation: "fade-in 0.8s ease-out 2.2s forwards" } : {}),
        }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-mono)] text-slate-muted/50 dark:text-night-muted/50">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-slate-muted/40 to-transparent dark:from-night-muted/40" />
      </div>
    </section>
  );
}
