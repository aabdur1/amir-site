"use client"

import React from "react"
import Link from "next/link"
import { useScrollReveal, useHydrated } from "@/lib/hooks"
import { ACCENT_STYLES } from "@/lib/styles"
import type { Game, GameSlug } from "@/lib/games/games"
import { STORAGE_KEY as SUDOKU_KEY } from "@/lib/games/sudoku/storage"
import { STORAGE_KEY as WORD_SEARCH_KEY } from "@/lib/games/word-search/storage"
import { STORAGE_KEY as WORD_SCRAMBLE_KEY } from "@/lib/games/word-scramble/storage"

const PROGRESS_KEYS: Record<GameSlug, string> = {
  sudoku: SUDOKU_KEY,
  "word-search": WORD_SEARCH_KEY,
  "word-scramble": WORD_SCRAMBLE_KEY,
}

// Reads only the puzzleId key — importing the bank or engine here would pull
// them into the index chunk. A solved-but-not-continued game still shows
// "In progress" (accepted: storage keeps the finished board until the next
// new game).
function hasProgress(slug: GameSlug): boolean {
  try {
    const raw = localStorage.getItem(PROGRESS_KEYS[slug])
    if (!raw) return false
    const parsed: unknown = JSON.parse(raw)
    return typeof (parsed as { puzzleId?: unknown } | null)?.puzzleId === "string"
  } catch {
    return false
  }
}

interface GameCardProps {
  game: Game
  index: number
  illustration: React.ReactNode
}

export function GameCard({ game, index, illustration }: GameCardProps) {
  const [ref, visible] = useScrollReveal()
  const hydrated = useHydrated()
  const styles = ACCENT_STYLES[game.accent]
  const inProgress = hydrated && hasProgress(game.slug)

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={visible ? {
        animation: `fade-in-up 0.6s ease-out ${index * 0.12}s forwards`,
        opacity: 0,
      } : { opacity: 0 }}
    >
      <Link
        href={`/games/${game.slug}`}
        className="card-hover group block rounded-xl border border-cream-border dark:border-night-border
          bg-white dark:bg-night-card overflow-hidden transition-all duration-300"
      >
        <div className={`flex items-center justify-center h-40 bg-cream-dark/50 dark:bg-night/60
          border-b border-cream-border dark:border-night-border ${visible ? 'is-drawn' : ''}`}>
          {illustration}
        </div>

        <div className="p-5">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-peach dark:text-peach-dark">
              {game.number}/
            </span>
            {/* inline text-shadow:none keeps the pre-h2 appearance — globals.css shadows all h2 */}
            <h2
              className="font-[family-name:var(--font-display)] text-lg text-ink dark:text-night-text"
              style={{ textShadow: "none" }}
            >
              {game.title}
            </h2>
          </div>

          <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-3">
            {game.description}
          </p>

          <div className="flex gap-2 flex-wrap">
            <span className={`${styles.bg} ${styles.border} border text-[12px] px-2.5 py-0.5 rounded-full
              font-[family-name:var(--font-mono)] ${styles.text}`}>
              Playable
            </span>
            {inProgress && (
              <span className="bg-peach/10 dark:bg-peach-dark/12 border-peach/25 dark:border-peach-dark/25
                border text-[12px] px-2.5 py-0.5 rounded-full
                font-[family-name:var(--font-mono)] text-ink dark:text-night-text/80">
                In progress
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
