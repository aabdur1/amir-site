"use client"

import React from "react"
import type { WordState } from "@/lib/games/word-scramble/engine"

export interface ScrambleBoardProps {
  ws: WordState
  wordDone: boolean
  onPlace: (tile: number) => void
  onReturn: (slot: number) => void
  onShuffle: () => void
  onHint: () => void
  onClear: () => void
}

// Tray tiles are the primary touch path: ≥44px both axes (h-12 = 48px).
// Slots may shrink to ~34px wide for 8-letter hard words at 320px — the
// sudoku board-cell precedent — but keep ≥44px height.
const TILE =
  "h-12 min-w-11 px-2 rounded-lg border border-cream-border dark:border-night-border " +
  "bg-white dark:bg-night-card text-ink dark:text-night-text text-xl " +
  "hover:border-mauve/50 dark:hover:border-mauve-dark/50 " +
  "active:bg-mauve/10 dark:active:bg-mauve-dark/15 transition-colors"

const CONTROL =
  "h-12 rounded-lg border text-[13px] font-[family-name:var(--font-mono)] tracking-wide " +
  "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted " +
  "hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors"

export function ScrambleBoard({
  ws, wordDone, onPlace, onReturn, onShuffle, onHint, onClear,
}: ScrambleBoardProps) {
  const n = ws.word.length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (/^[a-zA-Z]$/.test(e.key)) {
      const letter = e.key.toUpperCase()
      const tile = ws.tray.find((t) => ws.tiles[t] === letter)
      if (tile !== undefined) {
        e.preventDefault()
        onPlace(tile)
      }
      return
    }
    if (e.key === "Backspace") {
      for (let i = n - 1; i >= 0; i--) {
        if (ws.slots[i] !== null && !ws.locked[i]) {
          e.preventDefault()
          onReturn(i)
          return
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
      <div role="group" aria-label="Your answer" className="flex justify-center gap-1.5">
        {ws.slots.map((tile, i) => {
          const letter = tile === null ? null : ws.tiles[tile]
          const locked = ws.locked[i]
          const accent = locked || wordDone
          return (
            <button
              key={i}
              type="button"
              aria-disabled={locked || undefined}
              aria-label={`Slot ${i + 1} of ${n}, ${letter ?? "empty"}${locked ? ", revealed" : ""}`}
              onClick={() => { if (!locked) onReturn(i) }}
              className={`h-11 w-9 min-[360px]:w-11 rounded-lg border text-xl text-ink dark:text-night-text
                transition-colors ${
                accent
                  ? "border-rosewater/40 dark:border-rosewater-dark/40 bg-rosewater/10 dark:bg-rosewater-dark/12"
                  : letter
                    ? "border-cream-border dark:border-night-border bg-white dark:bg-night-card"
                    : "border-dashed border-cream-border dark:border-night-border"
              }`}
            >
              {letter}
            </button>
          )
        })}
      </div>

      <div role="group" aria-label="Letter tiles" className="flex flex-wrap justify-center gap-2 min-h-12">
        {ws.tray.map((tile) => (
          <button
            key={tile}
            type="button"
            aria-label={`Letter ${ws.tiles[tile]}`}
            onClick={() => onPlace(tile)}
            className={TILE}
          >
            {ws.tiles[tile]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onHint} className={CONTROL}>
          Reveal a letter
        </button>
        <button type="button" onClick={onShuffle} className={CONTROL}>
          Shuffle
        </button>
        <button type="button" onClick={onClear} className={CONTROL}>
          Clear
        </button>
      </div>
    </div>
  )
}
