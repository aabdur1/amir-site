/**
 * Integrity tests over the COMMITTED word-search bank. Unlike sudoku, the
 * expensive guarantee (each target readable at exactly one line, either
 * direction) is cheap here, so the test re-proves it for all 90 puzzles.
 */
import { WORD_SEARCH_PUZZLES } from '@/lib/games/word-search-puzzles'

const CONFIG: Record<string, { size: number; count: number }> = {
  easy: { size: 8, count: 8 },
  medium: { size: 10, count: 10 },
  hard: { size: 12, count: 12 },
}

// All maximal straight lines of a grid in the 4 canonical directions —
// reading each line forwards and backwards covers all 8 directions.
function allLines(grid: string, size: number): string[] {
  const at = (r: number, c: number) => grid[r * size + c]
  const lines: string[] = []
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => at(r, c)).join(''))
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => at(r, c)).join(''))
  for (let s = 0; s < 2 * size - 1; s++) {
    let se = '', ne = ''
    for (let r = 0; r < size; r++) {
      const cSE = s - r
      if (cSE >= 0 && cSE < size) se += at(r, size - 1 - cSE) // anti-diagonal family
      const cNE = s - (size - 1 - r)
      if (cNE >= 0 && cNE < size) ne += at(r, cNE)            // diagonal family
    }
    if (se.length > 1) lines.push(se)
    if (ne.length > 1) lines.push(ne)
  }
  return lines
}

function occurrences(lines: string[], word: string): number {
  const rev = [...word].reverse().join('')
  let n = 0
  for (const line of lines) {
    for (let i = 0; i + word.length <= line.length; i++) {
      const seg = line.slice(i, i + word.length)
      if (seg === word) n++
      if (seg === rev && rev !== word) n++
    }
  }
  return n
}

it('has 30 puzzles per difficulty with unique ids and correct shapes', () => {
  expect(WORD_SEARCH_PUZZLES).toHaveLength(90)
  expect(new Set(WORD_SEARCH_PUZZLES.map((p) => p.id)).size).toBe(90)
  for (const p of WORD_SEARCH_PUZZLES) {
    const { size, count } = CONFIG[p.difficulty]
    expect(p.size, p.id).toBe(size)
    expect(p.grid, p.id).toMatch(new RegExp(`^[A-Z]{${size * size}}$`))
    expect(p.words, p.id).toHaveLength(count)
    expect(p.placements, p.id).toHaveLength(count)
  }
})

it('every stored placement spells its word', () => {
  for (const p of WORD_SEARCH_PUZZLES) {
    for (const pl of p.placements) {
      const spelled = Array.from(
        { length: pl.word.length },
        (_, k) => p.grid[(pl.row + k * pl.dRow) * p.size + (pl.col + k * pl.dCol)]
      ).join('')
      expect(spelled, `${p.id}:${pl.word}`).toBe(pl.word)
    }
  }
})

it('every target is readable at exactly one location, either direction', () => {
  for (const p of WORD_SEARCH_PUZZLES) {
    const lines = allLines(p.grid, p.size)
    for (const word of p.words) {
      expect(occurrences(lines, word), `${p.id}:${word}`).toBe(1)
    }
  }
})
