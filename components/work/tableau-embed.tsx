'use client'

import { useState } from 'react'
import type { CaseStudyEmbed } from '@/lib/work/case-studies'

// Click-gated Tableau Public embed. Nothing from tableau.com loads on mount —
// the iframe enters the DOM only after the user asks for it (same pattern as
// the Python artifact's Pyodide gate). A plain iframe is deliberate: the
// Embedding API would pull an unpinned third-party script into our page
// context and need script-src widened; an iframe needs only frame-src.
// Placeholder copy and motif are data-driven via embed.kind and embed.caption.
const EMBED_PARAMS = ':embed=y&:showVizHome=no&:display_count=n'

const PILL_PRIMARY =
  'btn-lift inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-[family-name:var(--font-mono)] tracking-wide border border-mauve/40 dark:border-mauve-dark/40 bg-mauve/10 dark:bg-mauve-dark/10 text-mauve dark:text-mauve-dark hover:border-mauve dark:hover:border-mauve-dark transition-colors'

// Story-points motif: a line chart, a highlight table, and a scatter — the
// three views inside the airline story.
function StoryIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      {/* line chart */}
      <path d="M8 34 L20 26 L32 30 L44 22" fill="none" className="stroke-peach dark:stroke-peach-dark" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="40" x2="44" y2="40" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
      {/* highlight table */}
      <g className="fill-sapphire dark:fill-sapphire-dark">
        <rect x="56" y="18" width="10" height="6" rx="1" opacity="0.9" />
        <rect x="68" y="18" width="10" height="6" rx="1" opacity="0.55" />
        <rect x="56" y="27" width="10" height="6" rx="1" opacity="0.4" />
        <rect x="68" y="27" width="10" height="6" rx="1" opacity="0.7" />
        <rect x="56" y="36" width="10" height="6" rx="1" opacity="0.25" />
        <rect x="68" y="36" width="10" height="6" rx="1" opacity="0.45" />
      </g>
      {/* scatter + trend */}
      <line x1="88" y1="40" x2="112" y2="18" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" strokeDasharray="3" />
      <g className="fill-mauve dark:fill-mauve-dark">
        <circle cx="92" cy="36" r="2.2" />
        <circle cx="98" cy="31" r="2.2" />
        <circle cx="103" cy="27" r="2.2" />
        <circle cx="108" cy="24" r="2.2" />
      </g>
      <circle cx="97" cy="20" r="2.6" className="fill-peach dark:fill-peach-dark" />
      {/* baseline */}
      <line x1="8" y1="64" x2="112" y2="64" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
      <circle cx="60" cy="64" r="2" className="fill-peach dark:fill-peach-dark" />
    </svg>
  )
}

// Dashboard motif: KPI tile row, stacked area, heatmap cells, ranked bars —
// echoing the views inside the Spotify dashboard.
function DashboardIllustration() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      {/* KPI tile row */}
      <g className="stroke-ink-faint dark:stroke-night-border" fill="none" strokeWidth="1">
        <rect x="8" y="10" width="30" height="14" rx="2" />
        <rect x="45" y="10" width="30" height="14" rx="2" />
        <rect x="82" y="10" width="30" height="14" rx="2" />
      </g>
      <g className="stroke-mauve dark:stroke-mauve-dark" strokeWidth="2" strokeLinecap="round">
        <line x1="13" y1="17" x2="27" y2="17" />
        <line x1="50" y1="17" x2="64" y2="17" />
        <line x1="87" y1="17" x2="101" y2="17" />
      </g>
      {/* stacked area */}
      <path d="M8 52 L8 42 L20 44 L32 38 L44 41 L44 52 Z" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.75" />
      <path d="M8 42 L20 44 L32 38 L44 41 L44 34 L32 30 L20 36 L8 34 Z" className="fill-peach dark:fill-peach-dark" opacity="0.7" />
      {/* heatmap cells */}
      <g className="fill-sapphire dark:fill-sapphire-dark">
        <rect x="56" y="32" width="8" height="8" rx="1" opacity="0.3" />
        <rect x="66" y="32" width="8" height="8" rx="1" opacity="0.85" />
        <rect x="76" y="32" width="8" height="8" rx="1" opacity="0.55" />
        <rect x="56" y="42" width="8" height="8" rx="1" opacity="0.6" />
        <rect x="66" y="42" width="8" height="8" rx="1" opacity="0.4" />
        <rect x="76" y="42" width="8" height="8" rx="1" opacity="0.2" />
      </g>
      {/* ranked artist bars */}
      <g className="fill-mauve dark:fill-mauve-dark">
        <rect x="90" y="32" width="22" height="4" rx="1" opacity="0.9" />
        <rect x="90" y="39" width="16" height="4" rx="1" opacity="0.65" />
        <rect x="90" y="46" width="11" height="4" rx="1" opacity="0.45" />
      </g>
      {/* baseline + peach commit dot, echoing the story motif */}
      <line x1="8" y1="64" x2="112" y2="64" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
      <circle cx="60" cy="64" r="2" className="fill-peach dark:fill-peach-dark" />
    </svg>
  )
}

export function TableauEmbed({ embed }: { embed: CaseStudyEmbed }) {
  const [loaded, setLoaded] = useState(false)

  if (!loaded) {
    return (
      <div className="rounded-xl border border-cream-border dark:border-night-border bg-cream-dark/40 dark:bg-night-card/50 px-6 py-12 sm:py-16 text-center">
        <div className="flex justify-center mb-5">
          {embed.kind === 'dashboard' ? <DashboardIllustration /> : <StoryIllustration />}
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-ink-subtle dark:text-night-muted mb-6">
          {embed.caption}
        </p>
        <button type="button" onClick={() => setLoaded(true)} className={PILL_PRIMARY}>
          Load the interactive {embed.kind}
        </button>
        <p role="status" className="mt-4 text-[13px] text-ink-subtle dark:text-night-muted max-w-md mx-auto leading-relaxed">
          Loads third-party content from public.tableau.com only when you ask. Nothing is fetched
          before this click.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* The viz has an author-set fixed size; on narrow screens the frame
          pans horizontally instead of squashing the viz. */}
      <div className="overflow-x-auto rounded-xl border border-cream-border dark:border-night-border">
        <iframe
          src={`${embed.url}?${EMBED_PARAMS}`}
          title={embed.title}
          width={embed.width}
          height={embed.height}
          style={{ minWidth: embed.width, border: 0, display: 'block' }}
          allowFullScreen
        />
      </div>
      <p role="status" className="mt-2 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
        interactive {embed.kind} loaded from public.tableau.com {'·'} scroll sideways on small screens
      </p>
    </div>
  )
}
