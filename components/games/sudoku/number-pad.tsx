"use client"

import React from "react"

interface NumberPadProps {
  notesMode: boolean
  canUndo: boolean
  onDigit: (digit: number) => void
  onErase: () => void
  onUndo: () => void
  onToggleNotes: () => void
  onNewGame: () => void
}

// Two rows of five digit keys + a controls row. This layout (not a 3×3 pad)
// is what fits board + pad in one viewport on 568px-tall phones; every key
// is ≥44px in the thumb axis (h-12 = 48px, ≥51px wide at 320px).
const KEY =
  "h-12 rounded-lg border border-cream-border dark:border-night-border bg-white dark:bg-night-card " +
  "text-ink dark:text-night-text hover:border-mauve/50 dark:hover:border-mauve-dark/50 " +
  "active:bg-mauve/10 dark:active:bg-mauve-dark/15 transition-colors"

const CONTROL =
  "h-12 rounded-lg border text-[13px] font-[family-name:var(--font-mono)] tracking-wide transition-colors"

export function NumberPad({
  notesMode, canUndo, onDigit, onErase, onUndo, onToggleNotes, onNewGame,
}: NumberPadProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <button key={d} type="button" aria-label={`Enter ${d}`} onClick={() => onDigit(d)}
            className={`${KEY} text-xl`}>
            {d}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[6, 7, 8, 9].map((d) => (
          <button key={d} type="button" aria-label={`Enter ${d}`} onClick={() => onDigit(d)}
            className={`${KEY} text-xl`}>
            {d}
          </button>
        ))}
        <button type="button" aria-label="Erase" onClick={onErase} className={KEY}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="h-5 w-5 mx-auto">
            <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9L3 12l6-7z" />
            <path d="M12 9.5l5 5M17 9.5l-5 5" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={notesMode}
          onClick={onToggleNotes}
          className={`${CONTROL} ${
            notesMode
              ? "bg-mauve/10 dark:bg-mauve-dark/12 border-mauve/40 dark:border-mauve-dark/40 text-mauve dark:text-mauve-dark"
              : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/40 dark:hover:border-mauve-dark/40"
          }`}
        >
          Notes
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`${CONTROL} border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted
            hover:border-mauve/40 dark:hover:border-mauve-dark/40
            disabled:opacity-40 disabled:hover:border-cream-border dark:disabled:hover:border-night-border`}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className={`${CONTROL} border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted
            hover:border-peach/50 dark:hover:border-peach-dark/50`}
        >
          New game
        </button>
      </div>
    </div>
  )
}
