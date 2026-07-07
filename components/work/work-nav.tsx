import Link from 'next/link'
import type { CaseStudy } from '@/lib/work/case-studies'

// Prev/next between case studies — the LearnNav pattern for /work. The
// caller renders it only when at least one neighbor exists, so the
// single-entry case shows nothing rather than an empty ruled row.
export function WorkNav({ prev, next }: { prev: CaseStudy | null; next: CaseStudy | null }) {
  return (
    <nav
      aria-label="Case study navigation"
      className="flex items-center justify-between border-t border-cream-border dark:border-night-border pt-8 mt-16"
    >
      {prev ? (
        <Link
          href={`/work/${prev.slug}`}
          className="group flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors"
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
            className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M10 6H2M5 9L2 6l3-3" />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase">
            <span className="sr-only">Previous: </span>
            {prev.shortTitle}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/work/${next.slug}`}
          className="group flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors"
        >
          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase">
            <span className="sr-only">Next: </span>
            {next.shortTitle}
          </span>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          >
            <path d="M2 6h8M7 3l3 3-3 3" />
          </svg>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  )
}
