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

// Word scramble is ssr: false for the same reason: saved progress restores
// from localStorage (and the tray scrambles with Math.random) in a useState
// initializer.
export const WordScramble = dynamic(
  () => import('./word-scramble/word-scramble').then((m) => ({ default: m.WordScramble })),
  { ssr: false }
)

// Mahjong is ssr: false for the same reason: saved progress restores from
// localStorage in a useState initializer.
export const Mahjong = dynamic(
  () => import('./mahjong/mahjong').then((m) => ({ default: m.Mahjong })),
  { ssr: false }
)
