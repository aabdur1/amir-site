"use client"

import React, { useEffect, useState } from "react"
import {
  startGame, removePair, undo, freeSet, hasMoves, isCleared, findHint,
  shuffleRemaining, KINDS, pickPuzzle, formatElapsed,
  type MahjongState, type Difficulty,
} from "@/lib/games/mahjong/engine"
import { loadProgress, saveProgress } from "@/lib/games/mahjong/storage"
import { MAHJONG_DEALS } from "@/lib/games/mahjong-deals"
import { MAHJONG_LAYOUTS } from "@/lib/games/mahjong-layouts"
import { FACE_NAMES } from "./tile-faces"
import { MahjongBoard } from "./board"
import { ConfettiBurst } from "@/components/games/confetti"
import { SparkRule } from "@/components/spark-rule"
import { DIFFICULTY_STYLES } from "@/lib/styles"

type Panel = "none" | "new-game" | "solved"

const HINT_MS = 1600 // pulse duration for the Hint button's highlighted pair

// Mirrors scramble-board.tsx's CONTROL class exactly (controls-row precedent).
const CONTROL =
  "h-12 rounded-lg border text-[13px] font-[family-name:var(--font-mono)] tracking-wide " +
  "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted " +
  "hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors"

interface InitState {
  state: MahjongState
  elapsedSeconds: number
  usedIds: string[]
}

// Resume a saved deal when it still exists in the bank: rebuild via
// startGame, override kinds from the save when a shuffle diverged from the
// deal, then replay the saved removal order through removePair one pair at
// a time. Any no-op replay step means the save can't be trusted (corrupt,
// or hand-edited) — fall through to a fresh easy deal, keeping usedIds so
// the pick-avoidance streak survives. Undo history survives resume by
// construction: replaying pairs one at a time leaves `removed` built up
// exactly as it would have been through live play. Safe outside useEffect:
// ssr:false (python.tsx / word-scramble precedent).
function initState(): InitState {
  const saved = loadProgress()
  if (saved?.puzzleId) {
    const deal = MAHJONG_DEALS.find((d) => d.id === saved.puzzleId)
    if (deal) {
      let state = startGame(deal)
      if (saved.kinds) state = { ...state, kinds: saved.kinds }
      let valid = true
      for (let i = 0; i < saved.removed.length; i += 2) {
        const next = removePair(MAHJONG_LAYOUTS[deal.difficulty], state, saved.removed[i], saved.removed[i + 1])
        if (next === state) {
          valid = false
          break
        }
        state = next
      }
      if (valid) {
        return { state, elapsedSeconds: saved.elapsedSeconds, usedIds: saved.usedIds }
      }
    }
  }
  const { puzzle, usedIds } = pickPuzzle(MAHJONG_DEALS, "easy", saved?.usedIds ?? [])
  return { state: startGame(puzzle), elapsedSeconds: 0, usedIds }
}

export function Mahjong() {
  const [init] = useState(initState)
  const [state, setState] = useState(init.state)
  const [elapsed, setElapsed] = useState(init.elapsedSeconds)
  const [usedIds, setUsedIds] = useState(init.usedIds)
  const [selected, setSelected] = useState<number | null>(null)
  const [hintPair, setHintPair] = useState<[number, number] | null>(null)
  // Covers resuming an already-cleared saved board on mount.
  const [panel, setPanel] = useState<Panel>(() => (isCleared(init.state) ? "solved" : "none"))
  const [confirmSwitch, setConfirmSwitch] = useState<Difficulty | null>(null)
  // True only after a LIVE clear (set in the render-adjust below, which a
  // resumed-cleared board never reaches) — gates the one-shot ConfettiBurst
  const [celebrate, setCelebrate] = useState(false)
  const [status, setStatus] = useState("")

  const layout = MAHJONG_LAYOUTS[state.deal.difficulty]
  const cleared = isCleared(state)
  const pairsLeft = (state.deal.kinds.length - state.removed.length) / 2
  const hasProgress = state.removed.length > 0

  // Adjust panel state during render when the board transitions to cleared —
  // React's "adjust state while rendering" pattern (word-scramble precedent).
  // Idempotent via the panel === "none" guard.
  if (cleared && panel === "none") {
    setPanel("solved")
    setCelebrate(true) // idempotent on the Cancel re-fire: no remount, no re-burst
    setStatus("Board cleared")
  }

  // Autosave — write-through on every state change (tiny payload). kinds is
  // only persisted once a shuffle has diverged the board from the deal's
  // original kinds — otherwise resume just re-derives from the deal.
  useEffect(() => {
    const kindsDiverged = !state.deal.kinds.every((k, i) => k === state.kinds[i])
    saveProgress({
      puzzleId: state.deal.id,
      removed: state.removed,
      kinds: kindsDiverged ? state.kinds : null,
      elapsedSeconds: elapsed,
      usedIds,
    })
  }, [state, elapsed, usedIds])

  // Quiet timer — accrues while the tab is visible, stops once cleared.
  // Never rendered during play; revealed only in the solved panel.
  useEffect(() => {
    if (cleared) return
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [cleared, state.deal.id])

  // Hint pulse auto-clears after HINT_MS.
  useEffect(() => {
    if (!hintPair) return
    const id = window.setTimeout(() => setHintPair(null), HINT_MS)
    return () => window.clearTimeout(id)
  }, [hintPair])

  const handleTileTap = (i: number) => {
    if (i === -1) {
      setSelected(null)
      return
    }
    const blocked = !freeSet(layout, state).has(i)
    if (blocked) {
      setStatus("That tile is blocked")
      return
    }
    const faceName = FACE_NAMES[KINDS[state.kinds[i]]]
    if (selected === i) {
      setSelected(null)
      return
    }
    if (selected === null) {
      setSelected(i)
      setStatus(`${faceName} selected`)
      return
    }
    const next = removePair(layout, state, selected, i)
    if (next !== state) {
      setState(next)
      setSelected(null)
      setHintPair(null)
      const left = (next.deal.kinds.length - next.removed.length) / 2
      setStatus(`Matched two ${faceName}s — ${left} pairs left`)
    } else {
      setSelected(i)
      setStatus(`No match — ${faceName} selected`)
    }
  }

  const handleUndo = () => {
    if (state.removed.length === 0) return
    setState(undo(state))
    setSelected(null)
    setHintPair(null)
  }

  const handleHint = () => {
    const pair = findHint(layout, state)
    if (!pair) {
      setStatus("No free pairs — try Undo or Shuffle")
      return
    }
    setHintPair(pair)
    const faceName = FACE_NAMES[KINDS[state.kinds[pair[0]]]]
    setStatus(`Hint: two ${faceName}s`)
  }

  const handleShuffle = () => {
    setState(shuffleRemaining(layout, state))
    setSelected(null)
    setHintPair(null)
    setStatus("Tiles shuffled")
  }

  const startNewGame = (difficulty: Difficulty) => {
    const { puzzle: nextDeal, usedIds: nextUsed } = pickPuzzle(MAHJONG_DEALS, difficulty, usedIds)
    setState(startGame(nextDeal))
    setUsedIds(nextUsed)
    setElapsed(0)
    setSelected(null)
    setHintPair(null)
    setPanel("none")
    setConfirmSwitch(null)
    setCelebrate(false)
    setStatus(`New ${difficulty} puzzle`)
  }

  // Difficulty pills: instant switch when nothing is at stake, confirm first
  // when real progress would be abandoned (word-search precedent).
  const pickDifficulty = (d: Difficulty) => {
    if (d === state.deal.difficulty && !cleared) return
    if (hasProgress && !cleared) {
      setPanel("none")
      setConfirmSwitch(d)
      return
    }
    startNewGame(d)
  }

  const noMoves = !hasMoves(layout, state) && !cleared && panel === "none"

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-peach dark:text-peach-dark">
            04/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Mahjong
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 04 · {pairsLeft} pairs · {state.deal.difficulty}
        </p>
      </header>

      <div role="group" aria-label="Difficulty" className="mb-4 flex gap-2 lg:justify-center">
        {(["easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-label={`Play ${d}`}
            aria-pressed={d === state.deal.difficulty}
            onClick={() => pickDifficulty(d)}
            className={`h-11 px-4 rounded-full border text-[13px]
              font-[family-name:var(--font-mono)] tracking-wide transition-colors ${
              d === state.deal.difficulty
                ? `${DIFFICULTY_STYLES[d]} text-ink dark:text-night-text/80`
                : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/40 dark:hover:border-mauve-dark/40 hover:text-ink dark:hover:text-night-text"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[560px] mx-auto lg:mx-0">
          <MahjongBoard
            key={state.deal.id}
            layout={layout}
            state={state}
            selected={selected}
            hintPair={hintPair}
            onTileTap={handleTileTap}
          />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={state.removed.length === 0}
              className={`${CONTROL} disabled:opacity-40 disabled:pointer-events-none`}
            >
              Undo
            </button>
            <button type="button" onClick={handleHint} className={CONTROL}>
              Hint
            </button>
            <button type="button" onClick={() => setPanel("new-game")} className={CONTROL}>
              New game
            </button>
          </div>
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
                Board cleared
              </h2>
              <p className="font-[family-name:var(--font-mono)] text-[13px]
                text-ink-subtle dark:text-night-muted mb-5">
                {formatElapsed(elapsed)} · {state.deal.difficulty}
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
              {hasProgress && !cleared && (
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
          ) : noMoves ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-4 flex flex-col gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-wide uppercase
                text-ink-subtle dark:text-night-muted">
                No moves left
              </p>
              <p className="text-[13px] text-ink-subtle dark:text-night-muted">
                Shuffle the remaining tiles, or undo your way back.
              </p>
              <button
                type="button"
                onClick={handleShuffle}
                className={`h-12 rounded-lg border text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide
                  text-ink dark:text-night-text/80 transition-colors ${DIFFICULTY_STYLES[state.deal.difficulty]}`}
              >
                Shuffle remaining
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={state.removed.length === 0}
                className="h-11 rounded-lg border border-cream-border dark:border-night-border
                  text-[13px] font-[family-name:var(--font-mono)] tracking-wide
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors
                  disabled:opacity-40 disabled:pointer-events-none"
              >
                Undo
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {celebrate && <ConfettiBurst />}
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
