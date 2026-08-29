"use client"

import React, { useRef, useState } from "react"
import { lineBetween, type WordSearchPuzzle } from "@/lib/games/word-search/engine"
import { FOUND_STYLES } from "./found-styles"

export interface GridProps {
  puzzle: WordSearchPuzzle
  cellAccents: ReadonlyMap<number, number>
  disabled: boolean
  onAttempt: (cells: number[] | null) => void
  announce: (msg: string) => void
}

function cellLabel(i: number, size: number, letter: string, isAnchor: boolean): string {
  const base = `Row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}, letter ${letter}`
  return isAnchor ? `${base}, selected` : base
}

export function Grid({ puzzle, cellAccents, disabled, onAttempt, announce }: GridProps) {
  const { size, grid } = puzzle
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [anchor, setAnchor] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  // Tap-ends / keyboard-Enter share one path: first activation anchors,
  // second attempts the EXACT line between them (lineBetween — snapping two
  // taps would select a line the player never touched).
  const tapCell = (i: number) => {
    if (disabled) return
    if (anchor === null) {
      setAnchor(i)
      announce(`Anchor set at row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}`)
    } else if (anchor === i) {
      setAnchor(null)
      announce("Anchor cleared")
    } else {
      onAttempt(lineBetween(size, anchor, i))
      setAnchor(null)
    }
  }

  const move = (to: number) => {
    setFocusIndex(to)
    cellRefs.current[to]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const f = focusIndex
    let handled = true
    if (e.key === "ArrowLeft") move(f % size === 0 ? f : f - 1)
    else if (e.key === "ArrowRight") move(f % size === size - 1 ? f : f + 1)
    else if (e.key === "ArrowUp") move(f < size ? f : f - size)
    else if (e.key === "ArrowDown") move(f >= size * (size - 1) ? f : f + size)
    else if (e.key === "Enter" || e.key === " ") tapCell(f)
    else if (e.key === "Escape") {
      setAnchor(null)
      announce("Anchor cleared")
    } else handled = false
    if (handled) e.preventDefault()
  }

  return (
    <div
      role="grid"
      aria-label={`Word search grid, ${size} by ${size}`}
      onKeyDown={onKeyDown}
      className="grid w-full aspect-square select-none touch-none rounded-sm overflow-hidden
        border-2 border-ink/50 dark:border-night-text/40 bg-white dark:bg-night-card"
      style={{ gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size }, (_, r) => (
        <div key={r} role="row" className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {Array.from({ length: size }, (_, c) => {
            const i = r * size + c
            const accent = cellAccents.get(i)
            const isAnchor = anchor === i
            return (
              <button
                key={i}
                ref={(el) => { cellRefs.current[i] = el }}
                type="button"
                role="gridcell"
                data-cell={i}
                aria-label={cellLabel(i, size, grid[i], isAnchor)}
                aria-selected={isAnchor || undefined}
                tabIndex={i === focusIndex ? 0 : -1}
                onClick={() => {
                  setFocusIndex(i)
                  tapCell(i)
                }}
                className={`relative flex items-center justify-center transition-colors
                  font-[family-name:var(--font-mono)] text-[15px] sm:text-lg leading-none
                  text-ink dark:text-night-text
                  ${accent !== undefined ? FOUND_STYLES[accent].bg : ""}
                  ${isAnchor ? "ring-2 ring-inset ring-mauve dark:ring-mauve-dark" : ""}`}
              >
                {grid[i]}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
