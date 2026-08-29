"use client"

import React, { useMemo, useState } from "react"
import {
  attempt, isComplete, type FoundWord, type WordSearchPuzzle,
} from "@/lib/games/word-search/engine"
import { WORD_SEARCH_PUZZLES } from "@/lib/games/word-search-puzzles"
import { FOUND_STYLES } from "./found-styles"
import { Grid } from "./grid"
import { WordList } from "./word-list"

export function WordSearch() {
  const [puzzle] = useState<WordSearchPuzzle>(() => WORD_SEARCH_PUZZLES[0]) // Task 6: storage-based init
  const [found, setFound] = useState<FoundWord[]>([])
  const [status, setStatus] = useState("")

  const solved = isComplete(puzzle, found)

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

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          <Grid
            puzzle={puzzle}
            cellAccents={cellAccents}
            disabled={solved}
            onAttempt={handleAttempt}
            announce={setStatus}
          />
        </div>

        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[300px] lg:shrink-0">
          <WordList words={puzzle.words} found={foundMap} />
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
