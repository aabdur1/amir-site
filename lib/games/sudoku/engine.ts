// Pure sudoku game logic — no DOM, no React. The component in
// components/games/sudoku/ is a thin view over these functions.
// All state transitions are immutable: they return a new BoardState
// (or the SAME state object for no-ops, which callers rely on).

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface SudokuPuzzle {
  id: string
  difficulty: Difficulty
  givens: string // 81 chars, '0' = empty
  solution: string // 81 chars, digits 1-9
}

export interface Cell {
  value: number // 0 = empty
  given: boolean
  notes: number // bitmask: bit (d-1) set = pencil note d
}

export interface HistoryEntry {
  cells: { index: number; before: Cell; after: Cell }[]
}

export interface BoardState {
  puzzle: SudokuPuzzle
  cells: Cell[]
  history: HistoryEntry[]
}

export const HISTORY_CAP = 200

const PEERS: number[][] = (() => {
  const out: number[][] = []
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9)
    const c = i % 9
    const br = Math.floor(r / 3) * 3
    const bc = Math.floor(c / 3) * 3
    const set = new Set<number>()
    for (let k = 0; k < 9; k++) {
      set.add(r * 9 + k)
      set.add(k * 9 + c)
      set.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3))
    }
    set.delete(i)
    out.push([...set].sort((a, b) => a - b))
  }
  return out
})()

export function peers(index: number): number[] {
  return PEERS[index]
}

export function newGame(puzzle: SudokuPuzzle): BoardState {
  const cells = Array.from({ length: 81 }, (_, i) => {
    const d = puzzle.givens.charCodeAt(i) - 48
    return { value: d, given: d !== 0, notes: 0 }
  })
  return { puzzle, cells, history: [] }
}

// Rebuild a board from persisted values/notes. Givens are re-derived from the
// puzzle (a tampered/corrupt save can never override a given); history resets.
export function restoreGame(puzzle: SudokuPuzzle, values: string, notes: number[]): BoardState {
  const cells = Array.from({ length: 81 }, (_, i) => {
    const g = puzzle.givens.charCodeAt(i) - 48
    if (g !== 0) return { value: g, given: true, notes: 0 }
    const v = values.charCodeAt(i) - 48
    return { value: v >= 1 && v <= 9 ? v : 0, given: false, notes: (notes[i] ?? 0) & 0x1ff }
  })
  return { puzzle, cells, history: [] }
}

function pushHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [...history, entry]
  return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next
}

export function setValue(state: BoardState, index: number, digit: number): BoardState {
  const cell = state.cells[index]
  if (cell.given || cell.value === digit) return state
  const cells = state.cells.slice()
  const changed: HistoryEntry['cells'] = []
  const after = { value: digit, given: false, notes: 0 }
  changed.push({ index, before: cell, after })
  cells[index] = after
  // Placing a digit removes it from peer notes — one history entry for the
  // whole cascade so a single undo restores everything.
  const bit = 1 << (digit - 1)
  for (const p of PEERS[index]) {
    const pc = cells[p]
    if (!pc.given && pc.value === 0 && pc.notes & bit) {
      const pAfter = { ...pc, notes: pc.notes & ~bit }
      changed.push({ index: p, before: pc, after: pAfter })
      cells[p] = pAfter
    }
  }
  return { ...state, cells, history: pushHistory(state.history, { cells: changed }) }
}

export function toggleNote(state: BoardState, index: number, digit: number): BoardState {
  const cell = state.cells[index]
  if (cell.given || cell.value !== 0) return state
  const after = { ...cell, notes: cell.notes ^ (1 << (digit - 1)) }
  const cells = state.cells.slice()
  cells[index] = after
  return { ...state, cells, history: pushHistory(state.history, { cells: [{ index, before: cell, after }] }) }
}

export function eraseCell(state: BoardState, index: number): BoardState {
  const cell = state.cells[index]
  if (cell.given || (cell.value === 0 && cell.notes === 0)) return state
  const after = { value: 0, given: false, notes: 0 }
  const cells = state.cells.slice()
  cells[index] = after
  return { ...state, cells, history: pushHistory(state.history, { cells: [{ index, before: cell, after }] }) }
}

export function undo(state: BoardState): BoardState {
  const entry = state.history[state.history.length - 1]
  if (!entry) return state
  const cells = state.cells.slice()
  for (const { index, before } of entry.cells) cells[index] = before
  return { ...state, cells, history: state.history.slice(0, -1) }
}

export function mistakes(state: BoardState): number[] {
  const out: number[] = []
  for (let i = 0; i < 81; i++) {
    const c = state.cells[i]
    if (!c.given && c.value !== 0 && c.value !== state.puzzle.solution.charCodeAt(i) - 48) out.push(i)
  }
  return out
}

export function isComplete(state: BoardState): boolean {
  return state.cells.every((c) => c.value !== 0)
}

export function isSolved(state: BoardState): boolean {
  return state.cells.every((c, i) => c.value === state.puzzle.solution.charCodeAt(i) - 48)
}

export function serialize(state: BoardState): { values: string; notes: number[] } {
  return {
    values: state.cells.map((c) => String(c.value)).join(''),
    notes: state.cells.map((c) => c.notes),
  }
}

// Random puzzle of a difficulty, avoiding already-played ids. When the
// difficulty is exhausted its used entries reset (other difficulties keep
// theirs). Returns the updated used list alongside the pick.
export function pickPuzzle(
  puzzles: SudokuPuzzle[],
  difficulty: Difficulty,
  usedIds: string[],
  rand: () => number = Math.random
): { puzzle: SudokuPuzzle; usedIds: string[] } {
  const pool = puzzles.filter((p) => p.difficulty === difficulty)
  if (pool.length === 0) throw new Error(`No puzzles available for difficulty: ${difficulty}`)
  const used = new Set(usedIds)
  let fresh = pool.filter((p) => !used.has(p.id))
  let nextUsed = usedIds
  if (fresh.length === 0) {
    const poolIds = new Set(pool.map((p) => p.id))
    nextUsed = usedIds.filter((id) => !poolIds.has(id))
    fresh = pool
  }
  const puzzle = fresh[Math.floor(rand() * fresh.length)]
  return { puzzle, usedIds: [...nextUsed, puzzle.id] }
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} hr ${m} min`
  if (m > 0) return `${m} min`
  return `${seconds} sec`
}
