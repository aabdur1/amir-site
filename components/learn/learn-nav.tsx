import Link from "next/link"
import type { Artifact } from "@/lib/learn/artifacts"

interface LearnNavProps {
  prev: Artifact | null
  next: Artifact | null
}

export function LearnNav({ prev, next }: LearnNavProps) {
  return (
    <nav aria-label="Artifact navigation" className="flex items-center justify-between border-t border-cream-border dark:border-night-border pt-8 mt-16">
      {prev ? (
        <Link
          href={`/learn/${prev.slug}`}
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
            {prev.shortTitle}
          </span>
        </Link>
      ) : <div />}

      {next ? (
        <Link
          href={`/learn/${next.slug}`}
          className="group flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors"
        >
          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase">
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
      ) : <div />}
    </nav>
  )
}
