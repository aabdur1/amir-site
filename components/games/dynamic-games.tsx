'use client'

import dynamic from 'next/dynamic'

// Sudoku is ssr: false because it restores saved progress from localStorage
// in a useState initializer (python.tsx precedent) — SSR would mismatch.
export const Sudoku = dynamic(
  () => import('./sudoku/sudoku').then((m) => ({ default: m.Sudoku })),
  { ssr: false }
)

// Word search is ssr: false for the same reason as Sudoku: saved progress
// is restored from localStorage in a useState initializer.
export const WordSearch = dynamic(
  () => import('./word-search/word-search').then((m) => ({ default: m.WordSearch })),
  { ssr: false }
)
