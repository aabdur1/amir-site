"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function Footer() {
  const mounted = useHydrated();

  return (
    <footer className="relative py-14 sm:py-20 bg-cream-dark/40 dark:bg-night-card/30">
      {/* Top ornamental divider */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
        <span className="text-rosewater dark:text-rosewater-dark text-xs">&#9670;</span>
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
      </div>

      <div
        className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 text-center"
        style={{
          opacity: 0,
          ...(mounted ? { animation: "fade-in 0.8s ease-out 0.2s forwards" } : {}),
        }}
      >
        {/* Name */}
        <p className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-ink dark:text-night-text mb-4">
          Amir Abdur-Rahim
        </p>

        {/* Tagline */}
        <p className="font-[family-name:var(--font-badge)] italic text-sm sm:text-base
          text-ink-muted dark:text-night-muted mb-6">
          Healthcare meets technology
        </p>

        {/* Links row */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <a
            href="https://github.com/aabdur1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-muted dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            GitHub
          </a>
          <span className="text-cream-border dark:text-night-border text-[10px]">&#9670;</span>
          <a
            href="https://www.linkedin.com/in/amir-abdur-rahim/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-muted dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            LinkedIn
          </a>
          <span className="text-cream-border dark:text-night-border text-[10px]">&#9670;</span>
          <a
            href="mailto:amirabdurrahim@gmail.com"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-muted dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            Email
          </a>
        </div>

        {/* Copyright */}
        <p className="text-[11px] tracking-[0.2em] uppercase font-[family-name:var(--font-mono)]
          text-ink-faint dark:text-night-muted/50">
          &copy; {new Date().getFullYear()} &middot; Chicago, IL
        </p>
      </div>
    </footer>
  );
}
