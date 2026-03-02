"use client";

import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { AnimatedText } from "@/components/animated-text";
import { HeroSpeckles } from "@/components/hero-speckles";
import { InteractiveHeadshot } from "@/components/interactive-headshot";

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

const badges = [
  { text: "1st Place — AWS National Cloud Quest", accent: "sapphire" },
  { text: "Zscaler Zero Trust Architect", accent: "mauve" },
  { text: "MS in MIS — UIC '26", accent: "peach" },
  { text: "AWS Cloud Security Builder", accent: "lavender" },
] as const;

const BADGE_STYLES = {
  sapphire: {
    bg: "bg-sapphire/10 dark:bg-sapphire-dark/12",
    border: "border-sapphire/25 dark:border-sapphire-dark/25",
    hoverBorder: "hover:border-sapphire/50 dark:hover:border-sapphire-dark/50",
    dot: "bg-sapphire dark:bg-sapphire-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
  mauve: {
    bg: "bg-mauve/10 dark:bg-mauve-dark/12",
    border: "border-mauve/25 dark:border-mauve-dark/25",
    hoverBorder: "hover:border-mauve/50 dark:hover:border-mauve-dark/50",
    dot: "bg-mauve dark:bg-mauve-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
  peach: {
    bg: "bg-peach/10 dark:bg-peach-dark/12",
    border: "border-peach/25 dark:border-peach-dark/25",
    hoverBorder: "hover:border-peach/50 dark:hover:border-peach-dark/50",
    dot: "bg-peach dark:bg-peach-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
  lavender: {
    bg: "bg-lavender/10 dark:bg-lavender-dark/12",
    border: "border-lavender/25 dark:border-lavender-dark/25",
    hoverBorder: "hover:border-lavender/50 dark:hover:border-lavender-dark/50",
    dot: "bg-lavender dark:bg-lavender-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
} as const;

/*
 * Per-element scroll speeds — higher = rushes upward faster.
 * Top-of-composition elements have high rates, bottom ones are nearly static.
 * This creates the "spread" effect: gaps between elements widen as you scroll.
 */
const SCROLL_RATES = {
  scrollIndicator: 0.8,
  label: 0.5,
  headshot: 0.4,
  name: 0.28,
  rule: 0.2,
  tagline: 0.12,
  social: 0.06,
  badges: 0.02,
} as const;

export function Hero() {
  const mounted = useHydrated();
  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number>(0);
  const isInViewRef = useRef(true);

  // Per-element refs for layered parallax
  const labelRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const headshotRef = useRef<HTMLDivElement>(null);
  const scrollIndRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const updateParallax = useCallback(() => {
    if (!isInViewRef.current) return;
    const y = window.scrollY;

    const move = (el: HTMLElement | null, rate: number) => {
      if (el) el.style.transform = `translateY(${-y * rate}px)`;
    };

    move(scrollIndRef.current, SCROLL_RATES.scrollIndicator);
    move(labelRef.current, SCROLL_RATES.label);
    move(headshotRef.current, SCROLL_RATES.headshot);
    move(nameRef.current, SCROLL_RATES.name);
    move(ruleRef.current, SCROLL_RATES.rule);
    move(taglineRef.current, SCROLL_RATES.tagline);
    move(socialRef.current, SCROLL_RATES.social);
    move(badgesRef.current, SCROLL_RATES.badges);

    // Vertical line fades out on scroll (only after user starts scrolling)
    if (lineRef.current && y > 5) {
      lineRef.current.style.opacity = `${Math.max(0, 1 - y / 500)}`;
    }

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Delay parallax until entrance animations complete (~2.2s for last badge)
    // to avoid style.transform conflicting with fade-in-up animation forwards fill
    const timer = setTimeout(() => {
      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll(); // apply current scroll position immediately
    }, 2500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[calc(100dvh-4.5rem)] flex items-center justify-center"
    >
      <HeroSpeckles />

      {/* Decorative vertical line — left accent, fades at edges */}
      <div
        ref={lineRef}
        className="hero-line absolute left-12 lg:left-20 top-0 bottom-0 w-px hidden sm:block"
        style={{
          opacity: 0,
          ...(mounted ? { animation: "fade-in 1.2s ease-out 0.3s forwards" } : {}),
        }}
      />

      <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-12 lg:px-20 py-20">
        {/* Main content grid — asymmetric editorial */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center">

          {/* Left column: text content */}
          <div className="order-2 lg:order-1">
            {/* Small label */}
            <p
              ref={labelRef}
              className="text-xs tracking-[0.25em] uppercase font-[family-name:var(--font-mono)]
                text-ink-muted dark:text-night-muted mb-5 will-change-transform"
              style={{
                opacity: 0,
                ...(mounted ? { animation: "fade-in-up 0.6s ease-out 0.1s forwards" } : {}),
              }}
            >
              Software <span className="text-peach dark:text-peach-dark">&middot;</span> Healthcare <span className="text-peach dark:text-peach-dark">&middot;</span> Photography
            </p>

            {/* Name — editorial scale */}
            <h1
              ref={nameRef}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight
                text-ink dark:text-night-text font-[family-name:var(--font-display)] will-change-transform"
            >
              <AnimatedText text="Amir" />
              <br />
              <AnimatedText text="Abdur-Rahim" delay={200} />
            </h1>

            {/* Gold accent rule */}
            <div
              ref={ruleRef}
              className="mt-6 sm:mt-8 h-0.5 w-16 bg-mauve dark:bg-mauve-dark origin-left"
              style={{
                opacity: 0,
                transform: "scaleX(0)",
                ...(mounted ? { animation: "fade-in 0.4s ease-out 0.5s forwards, line-grow 0.8s ease-out 0.5s forwards" } : {}),
              }}
            />

            {/* Tagline — editorial italic serif */}
            <p
              ref={taglineRef}
              className="text-xl sm:text-2xl md:text-[1.7rem] mt-5 sm:mt-6 max-w-lg
                font-[family-name:var(--font-badge)] italic
                text-ink-muted dark:text-night-muted leading-relaxed"
              style={{
                opacity: 0,
                ...(mounted ? { animation: "fade-in-up 0.6s ease-out 0.8s forwards" } : {}),
              }}
            >
              Healthcare meets technology{" "}
              <span className="text-peach dark:text-peach-dark not-italic">&#8212;</span>{" "}
              <span className="text-ink dark:text-night-text not-italic font-[family-name:var(--font-body)] font-medium">Chicago.</span>
            </p>

            {/* Social links */}
            <div ref={socialRef} className="flex gap-2 items-center mt-8">
              <a
                href="https://github.com/aabdur1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="btn-lift flex items-center justify-center w-11 h-11 rounded-full
                  text-ink-muted dark:text-night-muted
                  hover:text-ink hover:bg-ink/5 dark:hover:text-night-text dark:hover:bg-night-text/5
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
                className="btn-lift flex items-center justify-center w-11 h-11 rounded-full
                  text-ink-muted dark:text-night-muted
                  hover:text-ink hover:bg-ink/5 dark:hover:text-night-text dark:hover:bg-night-text/5
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
                className="btn-lift flex items-center justify-center w-11 h-11 rounded-full
                  text-ink-muted dark:text-night-muted
                  hover:text-ink hover:bg-ink/5 dark:hover:text-night-text dark:hover:bg-night-text/5
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

            {/* Badges — multi-accent pills */}
            <div ref={badgesRef} className="flex flex-wrap gap-2 sm:gap-2.5 mt-10">
              {badges.map((badge, i) => {
                const s = BADGE_STYLES[badge.accent];
                return (
                  <span
                    key={badge.text}
                    className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2
                      ${s.bg} border ${s.border} ${s.hoverBorder}
                      text-[11px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
                      ${s.text}
                      hover:-translate-y-0.5 hover:shadow-card
                      hover:text-ink dark:hover:text-night-text`}
                    style={{
                      opacity: 0,
                      transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease, color 200ms ease",
                      ...(mounted
                        ? {
                            animation: `fade-in-up 0.5s ease-out ${1600 + i * 100}ms forwards`,
                          }
                        : {}),
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
                    {badge.text}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right column: headshot */}
          <div
            ref={headshotRef}
            className="order-1 lg:order-2 flex justify-center lg:justify-end will-change-transform"
            style={{
              opacity: 0,
              ...(mounted ? { animation: "fade-in 1s ease-out 0.3s forwards" } : {}),
            }}
          >
            <InteractiveHeadshot />
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div
        ref={scrollIndRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 will-change-transform"
        style={{
          opacity: 0,
          ...(mounted ? { animation: "fade-in 0.8s ease-out 2.2s forwards" } : {}),
        }}
      >
        <span
          className="text-[11px] tracking-[0.2em] uppercase font-[family-name:var(--font-mono)] text-lavender/50 dark:text-lavender-dark/50"
          style={{ animation: mounted ? "shimmer 3s ease-in-out 3s infinite" : "none" }}
        >
          Scroll
        </span>
        <div
          className="w-px h-8 bg-gradient-to-b from-ink-faint/40 to-transparent dark:from-night-muted/40"
          style={{ animation: mounted ? "float 2s ease-in-out infinite" : "none" }}
        />
      </div>
    </section>
  );
}
