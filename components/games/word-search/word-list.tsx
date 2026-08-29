"use client"

import React from "react"
import { FOUND_STYLES } from "./found-styles"

interface WordListProps {
  words: string[]
  found: ReadonlyMap<string, number> // word -> accent index
}

// Found words strike through in muted ink (accent text alone would fail AA
// on the lighter accents) — the accent lives in the dot, matching the
// word's cells on the grid.
export function WordList({ words, found }: WordListProps) {
  return (
    <ul aria-label="Words to find" className="flex flex-wrap gap-x-4 gap-y-2">
      {words.map((w) => {
        const accent = found.get(w)
        const isFound = accent !== undefined
        return (
          <li
            key={w}
            className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[13px] tracking-wide ${
              isFound
                ? "line-through text-ink-subtle/70 dark:text-night-muted/70"
                : "text-ink dark:text-night-text"
            }`}
          >
            {isFound && (
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${FOUND_STYLES[accent].dot}`} />
            )}
            {w}
            {isFound && <span className="sr-only">, found</span>}
          </li>
        )
      })}
    </ul>
  )
}
