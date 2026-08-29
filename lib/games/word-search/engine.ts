// Pure word-search logic — no DOM, no React. Selection geometry lives here
// (not in the component) so it is unit-testable: jsdom cannot exercise the
// pointer-drag path.

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface WordPlacement {
  word: string
  row: number
  col: number
  dRow: number
  dCol: number
}

export interface WordSearchPuzzle {
  id: string
  difficulty: Difficulty
  theme: string
  size: number
  grid: string // size*size chars, row-major, A-Z
  words: string[]
  placements: WordPlacement[]
}

export interface FoundWord {
  word: string
  cells: number[]
}

// Drag selection: snap the anchor→current vector to the nearest of the 8
// straight directions. Vertical/horizontal win when their delta is at least
// twice the other axis; everything else snaps diagonal. Length follows the
// dominant delta, clamped at the grid edge.
export function snapLine(size: number, anchor: number, current: number): number[] | null {
  if (anchor === current) return null
  const ar = Math.floor(anchor / size)
  const ac = anchor % size
  const dr = Math.floor(current / size) - ar
  const dc = (current % size) - ac
  let stepR: number
  let stepC: number
  let len: number
  if (Math.abs(dr) >= 2 * Math.abs(dc)) {
    stepR = Math.sign(dr); stepC = 0; len = Math.abs(dr)
  } else if (Math.abs(dc) >= 2 * Math.abs(dr)) {
    stepR = 0; stepC = Math.sign(dc); len = Math.abs(dc)
  } else {
    stepR = Math.sign(dr); stepC = Math.sign(dc); len = Math.max(Math.abs(dr), Math.abs(dc))
  }
  const cells: number[] = []
  for (let k = 0; k <= len; k++) {
    const r = ar + k * stepR
    const c = ac + k * stepC
    if (r < 0 || r >= size || c < 0 || c >= size) break
    cells.push(r * size + c)
  }
  return cells
}

// Tap-ends / keyboard selection: EXACT line or nothing — snapping two taps
// that aren't colinear would select a line the player never touched.
export function lineBetween(size: number, a: number, b: number): number[] | null {
  if (a === b) return null
  const ar = Math.floor(a / size)
  const ac = a % size
  const dr = Math.floor(b / size) - ar
  const dc = (b % size) - ac
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null
  const len = Math.max(Math.abs(dr), Math.abs(dc))
  const stepR = Math.sign(dr)
  const stepC = Math.sign(dc)
  const cells: number[] = []
  for (let k = 0; k <= len; k++) cells.push((ar + k * stepR) * size + (ac + k * stepC))
  return cells
}

export function readLine(grid: string, cells: number[]): string {
  return cells.map((i) => grid[i]).join('')
}

// Either read direction counts; cells come back oriented so they spell the
// word forwards (resume repaints don't care which way she dragged).
export function attempt(
  puzzle: WordSearchPuzzle,
  found: FoundWord[],
  cells: number[] | null
): FoundWord | null {
  if (!cells || cells.length < 2) return null
  const s = readLine(puzzle.grid, cells)
  const rev = [...s].reverse().join('')
  const foundSet = new Set(found.map((f) => f.word))
  for (const word of puzzle.words) {
    if (foundSet.has(word)) continue
    if (s === word) return { word, cells }
    if (rev === word) return { word, cells: [...cells].reverse() }
  }
  return null
}

export function isComplete(puzzle: WordSearchPuzzle, found: FoundWord[]): boolean {
  return found.length === puzzle.words.length
}

export { pickPuzzle, formatElapsed } from '../shared'
