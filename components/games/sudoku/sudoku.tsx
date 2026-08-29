"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  newGame, restoreGame, setValue, toggleNote, eraseCell, undo, mistakes,
  isComplete, isSolved, serialize, pickPuzzle, formatElapsed,
  type BoardState, type Difficulty,
} from "@/lib/games/sudoku/engine"
import {
  loadProgress, saveProgress, type SudokuSettings,
} from "@/lib/games/sudoku/storage"
import { SUDOKU_PUZZLES } from "@/lib/games/sudoku-puzzles"
import { SparkRule } from "@/components/spark-rule"
import { Board } from "./board"
import { NumberPad } from "./number-pad"

type Panel = "none" | "new-game" | "solved"

interface InitState {
  board: BoardState
  elapsedSeconds: number
  usedIds: string[]
  settings: SudokuSettings
}

// Resume a saved puzzle when the save is valid and its puzzle exists in the
// bank; otherwise auto-start a random easy puzzle (first visit = zero
// friction). usedIds/settings survive even when the saved puzzle doesn't.
// Safe outside useEffect: this component is ssr:false (python.tsx precedent).
function initState(): InitState {
  const saved = loadProgress()
  if (saved?.puzzleId) {
    const puzzle = SUDOKU_PUZZLES.find((p) => p.id === saved.puzzleId)
    if (puzzle) {
      return {
        board: restoreGame(puzzle, saved.values, saved.notes),
        elapsedSeconds: saved.elapsedSeconds,
        usedIds: saved.usedIds,
        settings: saved.settings,
      }
    }
  }
  const { puzzle, usedIds } = pickPuzzle(SUDOKU_PUZZLES, "easy", saved?.usedIds ?? [])
  return {
    board: newGame(puzzle),
    elapsedSeconds: 0,
    usedIds,
    settings: saved?.settings ?? { showMistakes: true },
  }
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "border-sapphire/40 dark:border-sapphire-dark/40 bg-sapphire/10 dark:bg-sapphire-dark/12 hover:border-sapphire dark:hover:border-sapphire-dark",
  medium: "border-peach/40 dark:border-peach-dark/40 bg-peach/10 dark:bg-peach-dark/12 hover:border-peach dark:hover:border-peach-dark",
  hard: "border-mauve/40 dark:border-mauve-dark/40 bg-mauve/10 dark:bg-mauve-dark/12 hover:border-mauve dark:hover:border-mauve-dark",
}

export function Sudoku() {
  const [init] = useState(initState)
  const [board, setBoard] = useState(init.board)
  const [elapsed, setElapsed] = useState(init.elapsedSeconds)
  const [usedIds, setUsedIds] = useState(init.usedIds)
  const [settings, setSettings] = useState(init.settings)
  const [selected, setSelected] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  // Covers resuming an already-solved saved board on mount.
  const [panel, setPanel] = useState<Panel>(() => (isSolved(init.board) ? "solved" : "none"))
  const [status, setStatus] = useState("")

  const solved = isSolved(board)
  const mistakeSet = useMemo(
    () => new Set(settings.showMistakes ? mistakes(board) : []),
    [board, settings.showMistakes]
  )
  const givensCount = useMemo(
    () => 81 - (board.puzzle.givens.match(/0/g)?.length ?? 0),
    [board.puzzle]
  )
  // Real progress detection — history resets on resume, so history.length
  // can't tell a fresh board from a resumed one. A non-given cell holding a
  // value or a note is unambiguous progress either way.
  const hasProgress = useMemo(
    () => board.cells.some((c) => !c.given && (c.value !== 0 || c.notes !== 0)),
    [board.cells]
  )

  // Adjust panel state during render when the board transitions to solved —
  // React's "adjust state while rendering" pattern, not an effect (avoids
  // react-hooks/set-state-in-effect and the extra render an effect would
  // cost). The panel === "none" guard makes this idempotent: it fires once
  // per solve and bails as soon as panel updates. It also self-heals the
  // "Cancel while solved" dead end — Cancel sets panel back to "none" while
  // solved is still true, so this re-fires and returns to the Solved panel.
  if (solved && panel === "none") {
    setPanel("solved")
    setStatus("Puzzle solved")
  }

  // Autosave — write-through on every state change (tiny payload)
  useEffect(() => {
    saveProgress({
      puzzleId: board.puzzle.id,
      ...serialize(board),
      elapsedSeconds: elapsed,
      usedIds,
      settings,
    })
  }, [board, elapsed, usedIds, settings])

  // Quiet timer — accrues while the tab is visible, stops once solved.
  // Never rendered during play; revealed only in the solved panel.
  useEffect(() => {
    if (solved) return
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [solved, board.puzzle.id])

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
    if (solved) return
    setBoard((b) => undo(b))
    setStatus("Undid last move")
  }

  const handleToggleNotes = () => {
    setNotesMode((m) => {
      setStatus(m ? "Notes mode off" : "Notes mode on")
      return !m
    })
  }

  const startNewGame = (difficulty: Difficulty) => {
    const { puzzle, usedIds: nextUsed } = pickPuzzle(SUDOKU_PUZZLES, difficulty, usedIds)
    setBoard(newGame(puzzle))
    setUsedIds(nextUsed)
    setElapsed(0)
    setSelected(null)
    setNotesMode(false)
    setPanel("none")
    setStatus(`New ${difficulty} puzzle`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      {/* Condensed title row — one line so the whole play surface fits 100dvh on phones */}
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-peach dark:text-peach-dark">
            01/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Sudoku
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 01 · {board.puzzle.difficulty} · {givensCount} given
        </p>
      </header>

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
          {/* With Show mistakes off there is no feedback until the board is
              full; a full-but-wrong board gets this nudge — no count, no
              locations (spec's mistake model) */}
          {isComplete(board) && !solved && (
            <p className="mt-3 text-center text-[13px] font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted">
              Something&apos;s not quite right yet.
            </p>
          )}
        </div>

        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[300px] lg:shrink-0">
          {panel === "solved" ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-6 text-center">
              <div className="flex justify-center mb-3">
                <SparkRule data={[2, 4, 3, 6, 5, 8, 9]} variant="line" visible
                  className="text-peach dark:text-peach-dark" />
              </div>
              <h2
                className="font-[family-name:var(--font-display)] text-2xl text-ink dark:text-night-text mb-2"
                style={{ textShadow: "none" }}
              >
                Solved
              </h2>
              <p className="font-[family-name:var(--font-mono)] text-[13px]
                text-ink-subtle dark:text-night-muted mb-5">
                solved in {formatElapsed(elapsed)} · {board.puzzle.difficulty}
              </p>
              <button
                type="button"
                onClick={() => setPanel("new-game")}
                className="btn-lift px-5 py-2.5 rounded-full text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide border
                  border-mauve/40 dark:border-mauve-dark/40 bg-mauve/10 dark:bg-mauve-dark/10
                  text-mauve dark:text-mauve-dark hover:border-mauve dark:hover:border-mauve-dark
                  transition-colors"
              >
                New puzzle
              </button>
            </div>
          ) : panel === "new-game" ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-4 flex flex-col gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-wide uppercase
                text-ink-subtle dark:text-night-muted">
                New game — pick a difficulty
              </p>
              {hasProgress && !solved && (
                <p className="text-[13px] text-red dark:text-red-dark">
                  This abandons your current puzzle.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => startNewGame(d)}
                    className={`h-12 rounded-lg border text-[13px]
                      font-[family-name:var(--font-mono)] tracking-wide
                      text-ink dark:text-night-text/80 transition-colors ${DIFFICULTY_STYLES[d]}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPanel("none")}
                className="h-11 rounded-lg text-[13px] font-[family-name:var(--font-mono)]
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <NumberPad
                notesMode={notesMode}
                canUndo={board.history.length > 0}
                onDigit={handleDigit}
                onErase={handleErase}
                onUndo={handleUndo}
                onToggleNotes={handleToggleNotes}
                onNewGame={() => setPanel("new-game")}
              />
              <button
                type="button"
                aria-pressed={settings.showMistakes}
                onClick={() => setSettings((s) => ({ ...s, showMistakes: !s.showMistakes }))}
                className="mt-3 inline-flex items-center gap-2 text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide
                  text-ink-subtle dark:text-night-muted
                  hover:text-ink dark:hover:text-night-text transition-colors py-3"
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-2 w-2 rounded-full transition-colors ${
                    settings.showMistakes ? "bg-red dark:bg-red-dark" : "bg-cream-border dark:bg-night-border"
                  }`}
                />
                Show mistakes
              </button>
            </>
          )}
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
