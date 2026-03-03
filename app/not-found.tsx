import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you were looking for does not exist.',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-4.5rem)] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          {/* Section label */}
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
            text-ink-subtle dark:text-night-muted mb-6">
            <span className="text-peach dark:text-peach-dark">00</span>
            <span className="mx-2 text-cream-border dark:text-night-border">/</span>
            Lost
          </p>

          {/* Big 404 */}
          <h1 className="text-8xl sm:text-9xl font-[family-name:var(--font-display)]
            text-ink dark:text-night-text leading-none tracking-tight">
            404
          </h1>

          {/* Mauve accent rule */}
          <div className="mt-6 mx-auto h-0.5 w-16 bg-mauve dark:bg-mauve-dark" />

          {/* Witty message */}
          <p className="mt-6 text-xl sm:text-2xl font-[family-name:var(--font-badge)] italic
            text-ink-subtle dark:text-night-muted leading-relaxed">
            You&apos;ve wandered off the map.
          </p>

          {/* Diamond ornament */}
          <div className="mt-8 text-peach dark:text-peach-dark text-xs">&#9670;</div>

          {/* Home link — styled like gallery pill */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8
              font-[family-name:var(--font-mono)] text-[13px] tracking-[0.15em] uppercase
              px-6 py-3 rounded-full border
              border-cream-border dark:border-night-border
              text-ink-subtle dark:text-night-muted
              hover:border-sapphire/60 dark:hover:border-sapphire-dark/60
              hover:text-ink dark:hover:text-night-text
              hover:-translate-y-0.5 hover:shadow-card
              transition-all duration-300"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 rotate-180"
            >
              <path d="M2 6h8M7 3l3 3-3 3" />
            </svg>
            Take me home
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
