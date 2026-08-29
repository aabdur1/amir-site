"use client"

import React, { useMemo, useState } from "react"
import {
  newGame, setValue, toggleNote, eraseCell, undo, mistakes, isSolved,
  type BoardState,
} from "@/lib/games/sudoku/engine"
import { SUDOKU_PUZZLES } from "@/lib/games/sudoku-puzzles"
import { Board } from "./board"
import { NumberPad } from "./number-pad"

export function Sudoku() {
  const [board, setBoard] = useState<BoardState>(() => newGame(SUDOKU_PUZZLES[0]))
  const [selected, setSelected] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [status, setStatus] = useState("")

  const solved = isSolved(board)
  const [showMistakes, setShowMistakes] = useState(true) // Task 7 persists this
  const mistakeSet = useMemo(
    () => new Set(showMistakes ? mistakes(board) : []),
    [board, showMistakes]
  )

  const handleDigit = (d: number) => {
    if (selected === null || solved) return
    setBoard((b) => (notesMode ? toggleNote(b, selected, d) : setValue(b, selected, d)))
    const r = Math.floor(selected / 9) + 1
    const c = (selected % 9) + 1
    setStatus(
      notesMode ? `Toggled note ${d} in row ${r}, column ${c}` : `Placed ${d} in row ${r}, column ${c}`
    )
  }

  const handleErase = () => {
    if (selected === null || solved) return
    setBoard((b) => eraseCell(b, selected))
    const r = Math.floor(selected / 9) + 1
    const c = (selected % 9) + 1
    setStatus(`Erased row ${r}, column ${c}`)
  }

  const handleUndo = () => {
    setBoard((b) => undo(b))
    setStatus("Undid last move")
  }

  const handleToggleNotes = () => {
    setNotesMode((m) => {
      setStatus(m ? "Notes mode off" : "Notes mode on")
      return !m
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          <Board
            cells={board.cells}
            selected={selected}
            mistakeSet={mistakeSet}
            onSelect={setSelected}
            onKeyDigit={handleDigit}
            onKeyErase={handleErase}
            onKeyToggleNotes={handleToggleNotes}
            onKeyUndo={handleUndo}
          />
        </div>
        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[300px] lg:shrink-0">
          <NumberPad
            notesMode={notesMode}
            canUndo={board.history.length > 0}
            onDigit={handleDigit}
            onErase={handleErase}
            onUndo={handleUndo}
            onToggleNotes={handleToggleNotes}
            onNewGame={() => {}}
          />
          <button
            type="button"
            aria-pressed={showMistakes}
            onClick={() => setShowMistakes((v) => !v)}
            className="mt-3 inline-flex items-center gap-2 text-[13px]
              font-[family-name:var(--font-mono)] tracking-wide
              text-ink-subtle dark:text-night-muted
              hover:text-ink dark:hover:text-night-text transition-colors py-3"
          >
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full transition-colors ${
                showMistakes ? "bg-red dark:bg-red-dark" : "bg-cream-border dark:bg-night-border"
              }`}
            />
            Show mistakes
          </button>
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
