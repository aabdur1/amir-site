import type { AccentColor } from '@/lib/styles'

// Single source of truth for /games — the index grid, /games/[slug] pages,
// and the per-game component registry all derive from this array.
// Adding a game: create its component, register it in
// components/games/dynamic-games.tsx + app/games/[slug]/page.tsx, add an
// entry here. The section is deliberately unlisted: no sitemap entries,
// no nav pill, robots noindex on every page.

// Adding a game: extend this union FIRST — Record<GameSlug, …> registries
// (GAME_COMPONENTS, the index ILLUSTRATIONS map, PROGRESS_KEYS in game-card.tsx)
// then fail to compile until every registry carries the new slug (/work FIGURES precedent).
export type GameSlug = 'sudoku' | 'word-search' | 'word-scramble' | 'mahjong'

export interface Game {
  slug: GameSlug
  title: string
  number: string
  description: string
  accent: AccentColor
}

export const GAMES: Game[] = [
  {
    slug: 'sudoku',
    title: 'Sudoku',
    number: '01',
    description: 'Classic 9×9 — three difficulties, pencil notes, undo, and your game saves itself. No ads, no timer pressure.',
    accent: 'sapphire',
  },
  {
    slug: 'word-search',
    title: 'Word Search',
    number: '02',
    description: 'Themed puzzles — swipe or tap to find the words. Three difficulties, and your game saves itself.',
    accent: 'lavender',
  },
  {
    slug: 'word-scramble',
    title: 'Word Scramble',
    number: '03',
    description: 'Unscramble themed words tile by tile — hints when you want them, and your game saves itself.',
    accent: 'rosewater',
  },
  {
    slug: 'mahjong',
    title: 'Mahjong',
    number: '04',
    description: 'Clear the tile stacks pair by pair — hints when you want them, and your game saves itself.',
    accent: 'mauve',
  },
]

export function getGame(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug)
}
