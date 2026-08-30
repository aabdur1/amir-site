// Pure mahjong-solitaire logic — no DOM, no React. The component in
// components/games/mahjong/ is a thin view over these functions.
// All state transitions are immutable: they return a new MahjongState
// (or the SAME state object for no-ops, which callers rely on).
//
// Geometry: positions are half-units, a tile's footprint is 2×2. A tile is
// FREE iff no remaining tile overlaps it one layer up AND at least one of
// its sides (x±2, |dy|≤1, same z) is open. Freeness is kind-agnostic —
// that is what makes peel construction (see peelAssign) work.

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Position { x: number; y: number; z: number }
export interface MahjongLayout { positions: Position[] }

export interface MahjongDeal {
  id: string
  difficulty: Difficulty
  kinds: number[]
  solution: number[]
}

export interface MahjongState {
  deal: MahjongDeal
  kinds: number[]
  removed: number[]
}

// The 26 kinds — deliberately the exact union of the difficulty pools, so
// the face registry (a compile-gated total Record) never demands a face no
// pool uses. Bank `kinds` arrays index into this list.
export const KINDS = [
  'dot-1', 'dot-2', 'dot-3', 'dot-4', 'dot-5', 'dot-6', 'dot-7', 'dot-8',
  'bam-1', 'bam-2', 'bam-3', 'bam-4', 'bam-5', 'bam-6', 'bam-7', 'bam-8',
  'num-1', 'num-2', 'num-3',
  'wind-e', 'wind-s', 'wind-w', 'wind-n',
  'dragon-r', 'dragon-g', 'dragon-w',
] as const

export type Kind = (typeof KINDS)[number]

export function startGame(deal: MahjongDeal): MahjongState {
  return { deal, kinds: deal.kinds.slice(), removed: [] }
}

export function removedSet(state: MahjongState): Set<number> {
  return new Set(state.removed)
}

function overlaps(a: Position, b: Position): boolean {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1
}

// Free position indexes among the remaining tiles.
export function freeSet(layout: MahjongLayout, state: MahjongState): Set<number> {
  const gone = removedSet(state)
  const pos = layout.positions
  const out = new Set<number>()
  for (let i = 0; i < pos.length; i++) {
    if (gone.has(i)) continue
    let covered = false
    let left = false
    let right = false
    for (let j = 0; j < pos.length; j++) {
      if (gone.has(j) || j === i) continue
      if (pos[j].z === pos[i].z + 1 && overlaps(pos[i], pos[j])) covered = true
      if (pos[j].z === pos[i].z && Math.abs(pos[j].y - pos[i].y) <= 1) {
        if (pos[j].x === pos[i].x - 2) left = true
        if (pos[j].x === pos[i].x + 2) right = true
      }
    }
    if (!covered && (!left || !right)) out.add(i)
  }
  return out
}

export function removePair(
  layout: MahjongLayout, state: MahjongState, a: number, b: number
): MahjongState {
  if (a === b) return state
  if (state.kinds[a] !== state.kinds[b]) return state
  const free = freeSet(layout, state)
  if (!free.has(a) || !free.has(b)) return state
  return { ...state, removed: [...state.removed, a, b] }
}

export function undo(state: MahjongState): MahjongState {
  if (state.removed.length === 0) return state
  return { ...state, removed: state.removed.slice(0, -2) }
}

export function isCleared(state: MahjongState): boolean {
  return state.removed.length === state.deal.kinds.length
}

// First free matching pair in index order — deterministic, so the Hint
// button and its tests agree.
export function findHint(layout: MahjongLayout, state: MahjongState): [number, number] | null {
  const free = [...freeSet(layout, state)].sort((a, b) => a - b)
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (state.kinds[free[i]] === state.kinds[free[j]]) return [free[i], free[j]]
    }
  }
  return null
}

export function hasMoves(layout: MahjongLayout, state: MahjongState): boolean {
  return findHint(layout, state) !== null
}

export { pickPuzzle, formatElapsed } from '../shared'
