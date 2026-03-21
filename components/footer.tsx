"use client";

import { useHydrated } from "@/lib/hooks";
import { SectionDivider } from "@/components/section-divider";

export function Footer() {
  const mounted = useHydrated();

  return (
    <footer className="relative py-14 sm:py-20 bg-cream-dark/50 dark:bg-night-card/40">
      <SectionDivider color="rosewater" absolute={false} />

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
          text-ink-subtle dark:text-night-muted mb-6">
          Healthcare meets technology
        </p>

        {/* Links row */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <a
            href="https://github.com/aabdur1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub (opens in new tab)"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            GitHub
          </a>
          <span aria-hidden="true" className="text-cream-border dark:text-night-border text-[12px]">&#9670;</span>
          <a
            href="https://www.linkedin.com/in/amir-abdur-rahim/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn (opens in new tab)"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            LinkedIn
          </a>
          <span aria-hidden="true" className="text-cream-border dark:text-night-border text-[12px]">&#9670;</span>
          <a
            href="mailto:amirabdurrahim@gmail.com"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            Email
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs tracking-[0.2em] uppercase font-[family-name:var(--font-mono)]
          text-ink-subtle dark:text-night-muted">
          &copy; {new Date().getFullYear()} &middot; Chicago, IL
        </p>
      </div>
    </footer>
  );
}
