'use client'

import { useScrollReveal } from '@/lib/hooks'
import { ACCENT_STYLES } from '@/lib/styles'
import { SectionDivider } from '@/components/section-divider'
import { TableauEmbed } from '@/components/work/tableau-embed'
import type { CaseStudy, CaseStudyBar, CaseStudySection } from '@/lib/work/case-studies'

// Renders a case study's content from its data entry — the client half of
// app/work/[slug]/page.tsx, mirroring how learn artifact components own their
// content under a thin server shell.

function MetricTiles({ metrics }: { metrics: NonNullable<CaseStudy['metrics']> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40 px-4 py-5 text-center"
        >
          <p className="font-[family-name:var(--font-display)] text-2xl text-ink dark:text-night-text mb-1.5">
            {m.value}
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-ink-subtle dark:text-night-muted">
            {m.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function PairedBars({ bar }: { bar: CaseStudyBar }) {
  const max = Math.max(bar.from.value, bar.to.value)
  const rows = [
    { ...bar.from, cls: 'bg-sapphire dark:bg-sapphire-dark' },
    { ...bar.to, cls: 'bg-peach dark:bg-peach-dark' },
  ]
  return (
    <div className="rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40 px-4 py-4">
      <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted mb-3">
        {bar.label}
      </p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="h-2.5 flex-1 rounded-full bg-cream-border/50 dark:bg-night-border/50 overflow-hidden">
              <div
                className={`h-full rounded-full ${row.cls}`}
                style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }}
              />
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted whitespace-nowrap w-40 text-right">
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ArticleSection({
  section,
  number,
  study,
}: {
  section: CaseStudySection
  number: string
  study: CaseStudy
}) {
  const [ref, visible] = useScrollReveal()
  const headingId = `ws-${number}`
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby={headingId}
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="text-center mb-6">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-peach dark:text-peach-dark">
          {number}/
        </p>
        <h2
          id={headingId}
          className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2"
        >
          {section.heading}
        </h2>
      </div>
      <div className="max-w-2xl mx-auto space-y-4">
        {section.body.map((paragraph, i) => (
          <p key={i} className="text-[15px] text-ink-subtle dark:text-night-muted leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      {section.embed && study.embed && (
        <div className="mt-8">
          <TableauEmbed embed={study.embed} />
        </div>
      )}
    </section>
  )
}

export function CaseStudyArticle({ study }: { study: CaseStudy }) {
  const accent = ACCENT_STYLES[study.accent]

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title block */}
      <div className="text-center mb-12">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          {study.number}/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-5">
          {study.title}
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted max-w-2xl mx-auto leading-relaxed mb-5">
          {study.lead}
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {study.role} {'·'} {study.provenance}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {study.tech.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${accent.bg} border ${accent.border} text-[12px] tracking-wide font-[family-name:var(--font-badge)] ${accent.text}`}
            >
              <span className={`w-1 h-1 rounded-full ${accent.dot} shrink-0`} />
              {t}
            </span>
          ))}
        </div>
        <div className="mt-6 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
      </div>

      {study.metrics && <MetricTiles metrics={study.metrics} />}

      {study.bars && study.bars.length > 0 && (
        <div className="mt-4 space-y-4">
          {study.bars.map((bar) => (
            <PairedBars key={bar.label} bar={bar} />
          ))}
        </div>
      )}

      {study.sections.map((section, i) => (
        <div key={section.heading}>
          {i > 0 && (
            <div className="py-10 [&>div]:mb-0">
              <SectionDivider absolute={false} />
            </div>
          )}
          <ArticleSection section={section} number={String(i + 1).padStart(2, '0')} study={study} />
        </div>
      ))}

      {/* Outbound links */}
      {study.links.length > 0 && (
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {study.links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.label} (opens in new tab)`}
                className="btn-lift inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-[family-name:var(--font-mono)] tracking-wide border border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-sapphire/60 dark:hover:border-sapphire-dark/60 hover:text-ink dark:hover:text-night-text transition-colors"
              >
                {link.label}
                <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path
                    fillRule="evenodd"
                    d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="btn-lift inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-[family-name:var(--font-mono)] tracking-wide border border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-sapphire/60 dark:hover:border-sapphire-dark/60 hover:text-ink dark:hover:text-night-text transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </div>
      )}
    </div>
  )
}
