'use client'

import React from 'react'
import Link from 'next/link'
import { useScrollReveal } from '@/lib/hooks'
import { ACCENT_STYLES } from '@/lib/styles'
import type { CaseStudy } from '@/lib/work/case-studies'

// /work index card — the homepage project-card vocabulary (accent top stripe,
// provenance line, tech pills) linking to the internal case-study page.
const STRIPE_STYLES = {
  sapphire: 'border-t-sapphire dark:border-t-sapphire-dark',
  mauve: 'border-t-mauve dark:border-t-mauve-dark',
  peach: 'border-t-peach dark:border-t-peach-dark',
  lavender: 'border-t-lavender dark:border-t-lavender-dark',
  rosewater: 'border-t-rosewater dark:border-t-rosewater-dark',
} as const

export function WorkCard({ study, index }: { study: CaseStudy; index: number }) {
  const [ref, visible] = useScrollReveal()
  const s = ACCENT_STYLES[study.accent]

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={
        visible
          ? { animation: `fade-in-up 0.6s ease-out ${index * 0.12}s forwards`, opacity: 0 }
          : { opacity: 0 }
      }
    >
      <Link
        href={`/work/${study.slug}`}
        className={`group relative flex h-full flex-col p-5 sm:p-6 rounded-2xl
          border-t-[3px] ${STRIPE_STYLES[study.accent]}
          bg-cream/80 dark:bg-night/60
          border border-cream-border/60 dark:border-night-border/60
          ${s.hoverBorder}
          card-hover`}
      >
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-[family-name:var(--font-mono)] text-[12px] text-peach dark:text-peach-dark">
            {study.number}/
          </span>
          <h2
            className="text-lg font-[family-name:var(--font-display)] text-ink dark:text-night-text leading-tight"
            style={{ textShadow: 'none' }}
          >
            {study.title}
          </h2>
        </div>

        <p className="text-[12px] font-[family-name:var(--font-mono)] tracking-wide text-ink-subtle dark:text-night-muted mb-3">
          {study.provenance}
        </p>

        <p className="text-sm font-[family-name:var(--font-body)] text-ink dark:text-night-text/70 leading-relaxed mb-4 flex-1">
          {study.summary}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {study.tech.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
                ${s.bg} border ${s.border}
                text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
                ${s.text}`}
            >
              <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
              {t}
            </span>
          ))}
        </div>

        {/* Internal-link arrow (right-pointing, not the external diagonal) */}
        <div
          className="absolute top-4 right-4 text-ink-faint/40 dark:text-night-muted/40
            group-hover:text-ink-muted dark:group-hover:text-night-muted
            transition-colors duration-200"
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
            className="w-4 h-4"
          >
            <path d="M2 6h8M7 3l3 3-3 3" />
          </svg>
        </div>
      </Link>
    </div>
  )
}
