"use client";

import Link from "next/link";
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
          Turning clinical data into decisions
        </p>

        {/* Closing CTA — frictionless contact at end-of-scroll (mirrors the hero pair) */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <a
            href="mailto:amirabdurrahim@gmail.com"
            className="inline-flex items-center justify-center rounded-full px-6 py-3
              bg-mauve dark:bg-mauve-dark text-cream dark:text-night
              text-[13px] tracking-wide font-[family-name:var(--font-badge)] font-medium
              transition-shadow duration-300 hover:shadow-card"
          >
            Get in touch
          </a>
          <a
            href="/Amir_Abdur-Rahim_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View resume (opens in new tab)"
            className="inline-flex items-center justify-center rounded-full px-6 py-3
              border border-ink/20 dark:border-night-border
              text-ink dark:text-night-text
              text-[13px] tracking-wide font-[family-name:var(--font-badge)]
              transition-[border-color,box-shadow] duration-300
              hover:border-sapphire/50 dark:hover:border-sapphire-dark/50 hover:shadow-card"
          >
            View resume
          </a>
        </div>

        {/* Links row */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mb-8">
          <Link
            href="/work"
            className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
              hover:-translate-y-px hover:underline hover:decoration-sapphire dark:hover:decoration-sapphire-dark
              hover:underline-offset-4 hover:decoration-2
              py-3 px-1 transition-all duration-200"
          >
            Work
          </Link>
          <span aria-hidden="true" className="text-cream-border dark:text-night-border text-[12px]">&#9670;</span>
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
