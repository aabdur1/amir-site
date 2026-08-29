"use client"

import React, { useRef } from "react"
import { peers, type Cell } from "@/lib/games/sudoku/engine"

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

interface BoardProps {
  cells: Cell[]
  selected: number | null
  mistakeSet: Set<number>
  onSelect: (index: number) => void
  onKeyDigit: (digit: number) => void
  onKeyErase: () => void
  onKeyToggleNotes: () => void
  onKeyUndo: () => void
}

function cellLabel(i: number, cell: Cell, mistake: boolean): string {
  const base = `Row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1}`
  if (cell.value !== 0) {
    const flags = [cell.given ? "given" : "", mistake ? "incorrect" : ""].filter(Boolean)
    return flags.length ? `${base}, ${cell.value}, ${flags.join(", ")}` : `${base}, ${cell.value}`
  }
  if (cell.notes !== 0) {
    const ns = DIGITS.filter((d) => cell.notes & (1 << (d - 1)))
    return `${base}, empty, notes ${ns.join(" ")}`
  }
  return `${base}, empty`
}

// Hairline cell borders + heavier 3×3 box separators, ledger style.
function cellBorders(i: number): string {
  const r = Math.floor(i / 9)
  const c = i % 9
  const cls: string[] = []
  if (c < 8)
    cls.push(
      c % 3 === 2
        ? "border-r-2 border-r-ink/50 dark:border-r-night-text/40"
        : "border-r border-r-cream-border dark:border-r-night-border"
    )
  if (r < 8)
    cls.push(
      r % 3 === 2
        ? "border-b-2 border-b-ink/50 dark:border-b-night-text/40"
        : "border-b border-b-cream-border dark:border-b-night-border"
    )
  return cls.join(" ")
}

// Hover highlight is a desktop enhancement — pointer-fine only, and only on
// cells that carry no computed highlight (two bg utilities on one element
// would have unpredictable cascade order).
const HOVER = "pointer-fine:hover:bg-mauve/10 dark:pointer-fine:hover:bg-mauve-dark/10"

export function Board({
  cells, selected, mistakeSet, onSelect, onKeyDigit, onKeyErase, onKeyToggleNotes, onKeyUndo,
}: BoardProps) {
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (to: number) => {
    onSelect(to)
    cellRefs.current[to]?.focus()
  }

  // Desktop keyboard layer — arrows move selection+focus together (roving
  // tabindex), digits enter, Backspace/Delete/0 erase, N notes, Z undo.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const sel = selected ?? 0
    let handled = true
    if (e.key === "ArrowLeft") move(sel % 9 === 0 ? sel : sel - 1)
    else if (e.key === "ArrowRight") move(sel % 9 === 8 ? sel : sel + 1)
    else if (e.key === "ArrowUp") move(sel < 9 ? sel : sel - 9)
    else if (e.key === "ArrowDown") move(sel > 71 ? sel : sel + 9)
    else if (e.key >= "1" && e.key <= "9") onKeyDigit(Number(e.key))
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") onKeyErase()
    else if (e.key === "n" || e.key === "N") onKeyToggleNotes()
    else if (e.key === "z" || e.key === "Z") onKeyUndo()
    else handled = false
    if (handled) e.preventDefault()
  }

  const selCell = selected !== null ? cells[selected] : null
  const selValue = selCell && selCell.value !== 0 ? selCell.value : 0
  const peerSet = selected !== null ? new Set(peers(selected)) : null

  return (
    <div
      role="grid"
      aria-label="Sudoku board"
      onKeyDown={onKeyDown}
      className="grid grid-rows-9 w-full aspect-square select-none rounded-sm overflow-hidden
        border-2 border-ink/50 dark:border-night-text/40 bg-white dark:bg-night-card"
    >
      {Array.from({ length: 9 }, (_, r) => (
        <div key={r} role="row" className="grid grid-cols-9">
          {Array.from({ length: 9 }, (_, c) => {
            const i = r * 9 + c
            const cell = cells[i]
            const mistake = mistakeSet.has(i)
            // Background priority: mistake > selected > same value > peer
            const bg = mistake
              ? "bg-red/10 dark:bg-red-dark/15"
              : i === selected
                ? "bg-mauve/20 dark:bg-mauve-dark/25"
                : selValue !== 0 && cell.value === selValue
                  ? "bg-sapphire/15 dark:bg-sapphire-dark/20"
                  : peerSet?.has(i)
                    ? "bg-mauve/5 dark:bg-mauve-dark/10"
                    : ""
            const text = mistake
              ? "text-red dark:text-red-dark"
              : cell.given
                ? "text-ink dark:text-night-text font-semibold"
                : "text-mauve dark:text-mauve-dark"
            return (
              <button
                key={i}
                ref={(el) => { cellRefs.current[i] = el }}
                type="button"
                role="gridcell"
                aria-label={cellLabel(i, cell, mistake)}
                aria-selected={i === selected || undefined}
                tabIndex={i === (selected ?? 0) ? 0 : -1}
                onClick={() => onSelect(i)}
                className={`relative flex items-center justify-center transition-colors
                  ${cellBorders(i)} ${bg || HOVER} ${text}`}
              >
                {cell.value !== 0 && (
                  <span className="text-xl sm:text-2xl leading-none">{cell.value}</span>
                )}
                {cell.value === 0 && cell.notes !== 0 && (
                  /* Pencil notes — sub-12px only below 375px viewports
                     (documented spec deviation: optional user annotations) */
                  <span
                    aria-hidden="true"
                    className="absolute inset-0.5 grid grid-cols-3 place-items-center
                      font-[family-name:var(--font-mono)] text-[9px] sm:text-[11px] leading-none
                      text-ink-subtle dark:text-night-muted"
                  >
                    {DIGITS.map((d) => (
                      <span key={d}>{cell.notes & (1 << (d - 1)) ? d : ""}</span>
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
