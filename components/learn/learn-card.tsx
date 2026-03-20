"use client"

import React from "react"
import Link from "next/link"
import { useScrollReveal } from "@/lib/hooks"
import { ACCENT_STYLES } from "@/lib/styles"
import type { Artifact } from "@/lib/learn/artifacts"
import type { AccentColor } from "@/lib/styles"

const CARD_ACCENTS: AccentColor[] = ['sapphire', 'mauve', 'peach', 'lavender']

interface LearnCardProps {
  artifact: Artifact
  index: number
  illustration: React.ReactNode
}

export function LearnCard({ artifact, index, illustration }: LearnCardProps) {
  const [ref, visible] = useScrollReveal()
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const styles = ACCENT_STYLES[accent]

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={visible ? {
        animation: `fade-in-up 0.6s ease-out ${index * 0.12}s forwards`,
        opacity: 0,
      } : { opacity: 0 }}
    >
      <Link
        href={`/learn/${artifact.slug}`}
        className="card-hover group block rounded-xl border border-cream-border dark:border-night-border
          bg-white dark:bg-night-card overflow-hidden transition-all duration-300"
      >
        {/* SVG illustration area */}
        <div className="flex items-center justify-center h-40 bg-cream-dark/50 dark:bg-night/60
          border-b border-cream-border dark:border-night-border">
          {illustration}
        </div>

        {/* Card content */}
        <div className="p-5">
          {/* Number + title */}
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-peach dark:text-peach-dark">
              {artifact.number}/
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-lg text-ink dark:text-night-text">
              {artifact.title}
            </h3>
          </div>

          {/* Subtopics */}
          <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-3">
            {artifact.subtopics.join(' · ')}
          </p>

          {/* Pills */}
          <div className="flex gap-2 flex-wrap">
            <span className={`${styles.bg} ${styles.border} border text-[12px] px-2.5 py-0.5 rounded-full
              font-[family-name:var(--font-mono)] ${styles.text}`}>
              {artifact.sectionCount} sections
            </span>
            <span className={`${styles.bg} ${styles.border} border text-[12px] px-2.5 py-0.5 rounded-full
              font-[family-name:var(--font-mono)] ${styles.text}`}>
              Interactive
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
