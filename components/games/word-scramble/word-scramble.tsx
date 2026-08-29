"use client"

import React, { useEffect, useState } from "react"
import {
  startWord, placeTile, returnSlot, returnAll, shuffleTray, revealLetter,
  isFilled, isCorrect, pickPuzzle, formatElapsed,
  type WordState, type ScramblePuzzle, type Difficulty,
} from "@/lib/games/word-scramble/engine"
import { loadProgress, saveProgress } from "@/lib/games/word-scramble/storage"
import { WORD_SCRAMBLE_PUZZLES } from "@/lib/games/word-scramble-puzzles"
import { ConfettiBurst } from "@/components/games/confetti"
import { SparkRule } from "@/components/spark-rule"
import { DIFFICULTY_STYLES } from "@/lib/styles"
import { ScrambleBoard } from "./scramble-board"

type Panel = "none" | "new-game" | "solved"

const ADVANCE_MS = 600 // solved-word accent beat before the next word deals

interface InitState {
  puzzle: ScramblePuzzle
  solvedCount: number
  ws: WordState | null // null once the puzzle is solved
  elapsedSeconds: number
  usedIds: string[]
}

// Resume a saved puzzle when the save is valid and its puzzle exists in the
// bank; otherwise auto-start a random easy puzzle (first visit = zero
// friction). usedIds survives even when the saved puzzle doesn't. Storage
// validates shape only; solvedCount clamps here against the resumed puzzle.
// Mid-word tile placement is deliberately not persisted — the current word
// re-deals fresh. Safe outside useEffect: ssr:false (python.tsx precedent).
function initState(): InitState {
  const saved = loadProgress()
  if (saved?.puzzleId) {
    const puzzle = WORD_SCRAMBLE_PUZZLES.find((p) => p.id === saved.puzzleId)
    if (puzzle) {
      const solvedCount = Math.min(saved.solvedCount, puzzle.words.length)
      return {
        puzzle,
        solvedCount,
        ws: solvedCount < puzzle.words.length ? startWord(puzzle.words[solvedCount]) : null,
        elapsedSeconds: saved.elapsedSeconds,
        usedIds: saved.usedIds,
      }
    }
  }
  const { puzzle, usedIds } = pickPuzzle(WORD_SCRAMBLE_PUZZLES, "easy", saved?.usedIds ?? [])
  return { puzzle, solvedCount: 0, ws: startWord(puzzle.words[0]), elapsedSeconds: 0, usedIds }
}

export function WordScramble() {
  const [init] = useState(initState)
  const [puzzle, setPuzzle] = useState(init.puzzle)
  const [solvedCount, setSolvedCount] = useState(init.solvedCount)
  const [ws, setWs] = useState(init.ws)
  const [elapsed, setElapsed] = useState(init.elapsedSeconds)
  const [usedIds, setUsedIds] = useState(init.usedIds)
  // Covers resuming an already-solved saved puzzle on mount.
  const [panel, setPanel] = useState<Panel>(() =>
    init.solvedCount >= init.puzzle.words.length ? "solved" : "none"
  )
  const [confirmSwitch, setConfirmSwitch] = useState<Difficulty | null>(null)
  // True only after a LIVE solve (set in the render-adjust below, which a
  // resumed-solved puzzle never reaches) — gates the one-shot ConfettiBurst
  const [celebrate, setCelebrate] = useState(false)
  // Accent flash on the just-solved word; the advance timer clears it
  const [wordDone, setWordDone] = useState(false)
  const [status, setStatus] = useState("")

  const total = puzzle.words.length
  const solved = solvedCount >= total
  const hasProgress = solvedCount > 0 || (ws !== null && ws.slots.some((t) => t !== null))

  // Adjust panel state during render when the puzzle transitions to solved —
  // React's "adjust state while rendering" pattern (sudoku/word-search
  // precedent). Idempotent via the panel === "none" guard.
  if (solved && panel === "none") {
    setPanel("solved")
    setCelebrate(true) // idempotent on the Cancel re-fire: no remount, no re-burst
    setStatus("All words unscrambled")
  }

  // Autosave — write-through on every state change (tiny payload)
  useEffect(() => {
    saveProgress({ puzzleId: puzzle.id, solvedCount, elapsedSeconds: elapsed, usedIds })
  }, [puzzle, solvedCount, elapsed, usedIds])

  // Quiet timer — accrues while the tab is visible, stops once solved.
  // Never rendered during play; revealed only in the solved panel.
  useEffect(() => {
    if (solved) return
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [solved, puzzle.id])

  // The solved-word beat: flash, then advance to the next word (or finish).
  // solvedCount is a dependency on purpose: state updaters must stay pure,
  // so the next word is computed from the closed-over value instead of
  // inside a setSolvedCount updater. A re-run from any dep change while
  // wordDone is false just early-returns.
  useEffect(() => {
    if (!wordDone) return
    const id = window.setTimeout(() => {
      setWordDone(false)
      const next = solvedCount + 1
      setSolvedCount(next)
      setWs(next < total ? startWord(puzzle.words[next]) : null)
    }, ADVANCE_MS)
    return () => window.clearTimeout(id)
  }, [wordDone, solvedCount, puzzle, total])

  const afterMove = (next: WordState) => {
    setWs(next)
    if (!isFilled(next)) return
    if (isCorrect(next)) {
      setWordDone(true)
      setStatus(`${next.word} solved — ${solvedCount + 1} of ${total}`)
    } else {
      // Worded distinctly from the visible nudge <p> below (same meaning,
      // different string) so the two don't collide as duplicate text nodes
      // for sighted-vs-sr-only queries; no test asserts this exact string.
      setStatus("Wrong order — letters kept in place")
    }
  }

  const handlePlace = (tile: number) => {
    if (!ws || wordDone || solved) return
    const next = placeTile(ws, tile)
    if (next !== ws) afterMove(next)
  }

  const handleReturn = (slot: number) => {
    if (!ws || wordDone || solved) return
    setWs(returnSlot(ws, slot))
  }

  const handleShuffle = () => {
    if (!ws || wordDone || solved) return
    const next = shuffleTray(ws, Math.random)
    if (next !== ws) {
      setWs(next)
      setStatus("Letters shuffled")
    }
  }

  const handleHint = () => {
    if (!ws || wordDone || solved) return
    const next = revealLetter(ws)
    if (next === ws) return
    if (isCorrect(next)) {
      setWs(next)
      setWordDone(true)
      setStatus(`${next.word} solved — ${solvedCount + 1} of ${total}`)
    } else {
      setWs(next)
      setStatus("Revealed a letter")
    }
  }

  const handleClear = () => {
    if (!ws || wordDone || solved) return
    const next = returnAll(ws)
    if (next !== ws) {
      setWs(next)
      setStatus("Letters returned")
    }
  }

  const startNewGame = (difficulty: Difficulty) => {
    const { puzzle: nextPuzzle, usedIds: nextUsed } = pickPuzzle(
      WORD_SCRAMBLE_PUZZLES, difficulty, usedIds
    )
    setPuzzle(nextPuzzle)
    setSolvedCount(0)
    setWs(startWord(nextPuzzle.words[0]))
    setUsedIds(nextUsed)
    setElapsed(0)
    setPanel("none")
    setConfirmSwitch(null)
    setCelebrate(false)
    setWordDone(false)
    setStatus(`New ${difficulty} puzzle`)
  }

  // Difficulty pills: instant switch when nothing is at stake, confirm
  // first when real progress would be abandoned (word-search precedent).
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
            03/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Word Scramble
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 03 · {puzzle.theme} · {solvedCount}/{total} solved
        </p>
      </header>

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
          {ws && (
            <ScrambleBoard
              ws={ws}
              wordDone={wordDone}
              onPlace={handlePlace}
              onReturn={handleReturn}
              onShuffle={handleShuffle}
              onHint={handleHint}
              onClear={handleClear}
            />
          )}
          {ws && isFilled(ws) && !isCorrect(ws) && !wordDone && (
            <p className="mt-3 text-center text-[13px] font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted">
              Not quite — tap letters to move them back
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
                Unscrambled all {total}
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
              {solvedCount > 0 && (
                <ul aria-label="Solved words" className="flex flex-wrap gap-x-4 gap-y-2">
                  {puzzle.words.slice(0, solvedCount).map((w) => (
                    <li
                      key={w}
                      className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)]
                        text-[13px] tracking-wide line-through text-ink-subtle/70 dark:text-night-muted/70"
                    >
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-peach dark:bg-peach-dark" />
                      {w}
                      <span className="sr-only">, solved</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setPanel("new-game")}
                className={`${solvedCount > 0 ? "mt-4" : ""} w-full h-11 rounded-lg border
                  border-cream-border dark:border-night-border
                  text-[13px] font-[family-name:var(--font-mono)] tracking-wide
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors`}
              >
                New game
              </button>
            </>
          )}
        </div>
      </div>
      {celebrate && <ConfettiBurst />}
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
