/**
 * Re-proves the committed word-scramble bank's invariants (generation-time
 * assertions live in scripts/generate-word-scramble-puzzles.mjs; this
 * mirrors the ones checkable from the bank alone).
 */
import { WORD_SCRAMBLE_PUZZLES } from '@/lib/games/word-scramble-puzzles'

const THEME_NAMES = [
  'In the Kitchen', 'Garden', 'Weather', 'Travel',
  'Animals', 'Music', 'Baking', 'Around Town',
]
const WORD_COUNT = { easy: 6, medium: 7, hard: 8 } as const
const anagramKey = (w: string) => [...w].sort().join('')

it('has 90 puzzles, 30 per difficulty, unique ids with the right prefixes', () => {
  expect(WORD_SCRAMBLE_PUZZLES).toHaveLength(90)
  expect(new Set(WORD_SCRAMBLE_PUZZLES.map((p) => p.id)).size).toBe(90)
  for (const [difficulty, prefix] of [['easy', 'se'], ['medium', 'sm'], ['hard', 'sh']] as const) {
    const pool = WORD_SCRAMBLE_PUZZLES.filter((p) => p.difficulty === difficulty)
    expect(pool).toHaveLength(30)
    for (const p of pool) expect(p.id).toMatch(new RegExp(`^${prefix}\\d{2}$`))
  }
})

it('every puzzle: known theme, correct word count, uppercase words ≥4 letters, distinct, anagram-free', () => {
  for (const p of WORD_SCRAMBLE_PUZZLES) {
    expect(THEME_NAMES).toContain(p.theme)
    expect(p.words).toHaveLength(WORD_COUNT[p.difficulty])
    expect(new Set(p.words).size).toBe(p.words.length)
    const keys = p.words.map(anagramKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const w of p.words) {
      expect(w).toMatch(/^[A-Z]{4,}$/)
    }
  }
})

it('difficulty tracks word length: every hard word ≥ 6 letters, every easy word ≤ 6', () => {
  for (const p of WORD_SCRAMBLE_PUZZLES) {
    for (const w of p.words) {
      if (p.difficulty === 'easy') expect(w.length).toBeLessThanOrEqual(6)
      if (p.difficulty === 'hard') expect(w.length).toBeGreaterThanOrEqual(6)
    }
  }
})
