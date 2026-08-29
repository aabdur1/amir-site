"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  attempt, isComplete, pickPuzzle, formatElapsed,
  type FoundWord, type WordSearchPuzzle, type Difficulty,
} from "@/lib/games/word-search/engine"
import { loadProgress, saveProgress } from "@/lib/games/word-search/storage"
import { WORD_SEARCH_PUZZLES } from "@/lib/games/word-search-puzzles"
import { SparkRule } from "@/components/spark-rule"
import { DIFFICULTY_STYLES } from "@/lib/styles"
import { FOUND_STYLES } from "./found-styles"
import { Grid } from "./grid"
import { WordList } from "./word-list"

type Panel = "none" | "new-game" | "solved"

interface InitState {
  puzzle: WordSearchPuzzle
  found: FoundWord[]
  elapsedSeconds: number
  usedIds: string[]
}

// Resume a saved puzzle when the save is valid and its puzzle exists in the
// bank; otherwise auto-start a random easy puzzle (first visit = zero
// friction). usedIds survives even when the saved puzzle doesn't. The
// storage module only checks shape (loadProgress) — puzzle-consistency of
// `found` (belongs to this puzzle, no dupes, in-range cells) is checked
// here, against the resumed puzzle. Safe outside useEffect: this component
// is ssr:false (python.tsx precedent).
function initState(): InitState {
  const saved = loadProgress()
  if (saved?.puzzleId) {
    const puzzle = WORD_SEARCH_PUZZLES.find((p) => p.id === saved.puzzleId)
    if (puzzle) {
      const seen = new Set<string>()
      const found = saved.found.filter((f) => {
        if (!puzzle.words.includes(f.word)) return false
        if (seen.has(f.word)) return false
        if (f.cells.length !== f.word.length) return false
        if (!f.cells.every((c) => Number.isInteger(c) && c >= 0 && c < puzzle.size * puzzle.size)) return false
        seen.add(f.word)
        return true
      })
      return { puzzle, found, elapsedSeconds: saved.elapsedSeconds, usedIds: saved.usedIds }
    }
  }
  const { puzzle, usedIds } = pickPuzzle(WORD_SEARCH_PUZZLES, "easy", saved?.usedIds ?? [])
  return { puzzle, found: [], elapsedSeconds: 0, usedIds }
}

export function WordSearch() {
  const [init] = useState(initState)
  const [puzzle, setPuzzle] = useState(init.puzzle)
  const [found, setFound] = useState(init.found)
  const [elapsed, setElapsed] = useState(init.elapsedSeconds)
  const [usedIds, setUsedIds] = useState(init.usedIds)
  // Covers resuming an already-solved saved puzzle on mount.
  const [panel, setPanel] = useState<Panel>(() => (isComplete(init.puzzle, init.found) ? "solved" : "none"))
  // Difficulty pill tapped mid-puzzle — held until confirmed or dismissed
  const [confirmSwitch, setConfirmSwitch] = useState<Difficulty | null>(null)
  const [status, setStatus] = useState("")

  const solved = isComplete(puzzle, found)
  const hasProgress = found.length > 0

  const cellAccents = useMemo(() => {
    const m = new Map<number, number>()
    found.forEach((f, i) => f.cells.forEach((c) => m.set(c, i % FOUND_STYLES.length)))
    return m
  }, [found])

  const foundMap = useMemo(() => {
    const m = new Map<string, number>()
    found.forEach((f, i) => m.set(f.word, i % FOUND_STYLES.length))
    return m
  }, [found])

  // Adjust panel state during render when the puzzle transitions to solved —
  // React's "adjust state while rendering" pattern, not an effect (avoids
  // react-hooks/set-state-in-effect and the extra render an effect would
  // cost). The panel === "none" guard makes this idempotent: it fires once
  // per solve and bails as soon as panel updates.
  if (solved && panel === "none") {
    setPanel("solved")
    setStatus("All words found")
  }

  // Autosave — write-through on every state change (tiny payload)
  useEffect(() => {
    saveProgress({
      puzzleId: puzzle.id,
      found,
      elapsedSeconds: elapsed,
      usedIds,
    })
  }, [puzzle, found, elapsed, usedIds])

  // Quiet timer — accrues while the tab is visible, stops once solved.
  // Never rendered during play; revealed only in the solved panel.
  useEffect(() => {
    if (solved) return
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [solved, puzzle.id])

  const handleAttempt = (cells: number[] | null) => {
    if (solved) return
    if (!cells) {
      setStatus("Those letters aren't in a straight line")
      return
    }
    const hit = attempt(puzzle, found, cells)
    if (hit) {
      const nextCount = found.length + 1
      setFound((f) => [...f, hit])
      setStatus(
        nextCount === puzzle.words.length
          ? "All words found"
          : `Found ${hit.word} — ${nextCount} of ${puzzle.words.length}`
      )
    } else {
      setStatus("Not a word — cleared")
    }
  }

  const startNewGame = (difficulty: Difficulty) => {
    const { puzzle: nextPuzzle, usedIds: nextUsed } = pickPuzzle(WORD_SEARCH_PUZZLES, difficulty, usedIds)
    setPuzzle(nextPuzzle)
    setFound([])
    setUsedIds(nextUsed)
    setElapsed(0)
    setPanel("none")
    setConfirmSwitch(null)
    setStatus(`New ${difficulty} puzzle`)
  }

  // Difficulty pills: instant switch when nothing is at stake (fresh or
  // solved puzzle), confirm first when real progress would be abandoned.
  // Tapping the current difficulty mid-game is a no-op so a stray tap
  // can't re-deal the puzzle she's working on.
  const pickDifficulty = (d: Difficulty) => {
    if (d === puzzle.difficulty && !solved) return
    if (hasProgress && !solved) {
      setPanel("none")
      setConfirmSwitch(d)
      return
    }
    startNewGame(d)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-peach dark:text-peach-dark">
            02/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Word Search
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 02 · {puzzle.theme} · {found.length}/{puzzle.words.length} found
        </p>
      </header>

      {/* Difficulty pills — pick a level from the very first screen or any
          time after; pickDifficulty confirms before abandoning progress.
          aria-labels are "Play easy" etc. so they never collide with the
          new-game panel's plain "easy"/"medium"/"hard" buttons. */}
      <div role="group" aria-label="Difficulty" className="mb-4 flex gap-2 lg:justify-center">
        {(["easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-label={`Play ${d}`}
            aria-pressed={d === puzzle.difficulty}
            onClick={() => pickDifficulty(d)}
            className={`h-11 px-4 rounded-full border text-[13px]
              font-[family-name:var(--font-mono)] tracking-wide transition-colors ${
              d === puzzle.difficulty
                ? `${DIFFICULTY_STYLES[d]} text-ink dark:text-night-text/80`
                : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/40 dark:hover:border-mauve-dark/40 hover:text-ink dark:hover:text-night-text"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          <Grid
            key={puzzle.id}
            puzzle={puzzle}
            cellAccents={cellAccents}
            disabled={solved}
            onAttempt={handleAttempt}
            announce={setStatus}
          />
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
                Found all {puzzle.words.length}
              </h2>
              <p className="font-[family-name:var(--font-mono)] text-[13px]
                text-ink-subtle dark:text-night-muted mb-5">
                {formatElapsed(elapsed)} · {puzzle.theme} · {puzzle.difficulty}
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
          ) : confirmSwitch ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-4 flex flex-col gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-wide uppercase
                text-ink-subtle dark:text-night-muted">
                Start a new {confirmSwitch} puzzle?
              </p>
              <p className="text-[13px] text-red dark:text-red-dark">
                This abandons your current puzzle.
              </p>
              <button
                type="button"
                onClick={() => startNewGame(confirmSwitch)}
                className={`h-12 rounded-lg border text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide
                  text-ink dark:text-night-text/80 transition-colors ${DIFFICULTY_STYLES[confirmSwitch]}`}
              >
                Start {confirmSwitch} puzzle
              </button>
              <button
                type="button"
                onClick={() => setConfirmSwitch(null)}
                className="h-11 rounded-lg text-[13px] font-[family-name:var(--font-mono)]
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  transition-colors"
              >
                Keep playing
              </button>
            </div>
          ) : (
            <>
              <WordList words={puzzle.words} found={foundMap} />
              <button
                type="button"
                onClick={() => setPanel("new-game")}
                className="mt-4 w-full h-11 rounded-lg border border-cream-border dark:border-night-border
                  text-[13px] font-[family-name:var(--font-mono)] tracking-wide
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors"
              >
                New game
              </button>
            </>
          )}
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
