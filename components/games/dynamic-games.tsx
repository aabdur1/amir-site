'use client'

import dynamic from 'next/dynamic'

// Sudoku is ssr: false because it restores saved progress from localStorage
// in a useState initializer (python.tsx precedent) — SSR would mismatch.
export const Sudoku = dynamic(
  () => import('./sudoku/sudoku').then((m) => ({ default: m.Sudoku })),
  { ssr: false }
)
