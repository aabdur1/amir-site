// Pure word-scramble game logic — no DOM, no React. The component in
// components/games/word-scramble/ is a thin view over these functions.
// All state transitions are immutable: they return a new WordState
// (or the SAME state object for no-ops, which callers rely on).
//
// Identity model: `tiles` is fixed (index = tile identity); the tray and
// slots reference tiles BY INDEX. Duplicate letters are therefore
// interchangeable for correctness but distinct for placement/return.

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface ScramblePuzzle {
  id: string
  difficulty: Difficulty
  theme: string
  words: string[] // solve order as stored
}

export interface WordState {
  word: string
  tiles: string[]
  tray: number[]
  slots: (number | null)[]
  locked: boolean[]
}

function fisherYates(arr: number[], rand: () => number): number[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Permutation of tile indexes whose letter sequence differs from the word.
// The cap is unreachable for real words with ≥2 distinct letters; on cap,
// the last shuffle is returned rather than looping forever.
export function scrambleOrder(word: string, rand: () => number): number[] {
  const base = Array.from(word, (_, i) => i)
  let order = base
  for (let i = 0; i < 50; i++) {
    order = fisherYates(base, rand)
    if (order.some((t, k) => word[t] !== word[k])) break
  }
  return order
}

export function startWord(word: string, rand: () => number = Math.random): WordState {
  return {
    word,
    tiles: [...word],
    tray: scrambleOrder(word, rand),
    slots: Array.from(word, () => null),
    locked: Array.from(word, () => false),
  }
}

export function placeTile(ws: WordState, tile: number): WordState {
  if (!ws.tray.includes(tile)) return ws
  const slot = ws.slots.indexOf(null)
  if (slot === -1) return ws
  const slots = ws.slots.slice()
  slots[slot] = tile
  return { ...ws, slots, tray: ws.tray.filter((t) => t !== tile) }
}

export function returnSlot(ws: WordState, slot: number): WordState {
  const tile = ws.slots[slot]
  if (tile === null || tile === undefined || ws.locked[slot]) return ws
  const slots = ws.slots.slice()
  slots[slot] = null
  return { ...ws, slots, tray: [...ws.tray, tile] }
}

export function returnAll(ws: WordState): WordState {
  if (!ws.slots.some((t, i) => t !== null && !ws.locked[i])) return ws
  const slots = ws.slots.slice()
  const freed: number[] = []
  slots.forEach((t, i) => {
    if (t !== null && !ws.locked[i]) {
      freed.push(t)
      slots[i] = null
    }
  })
  return { ...ws, slots, tray: [...ws.tray, ...freed] }
}

export function isFilled(ws: WordState): boolean {
  return ws.slots.every((t) => t !== null)
}

export function isCorrect(ws: WordState): boolean {
  return isFilled(ws) && ws.slots.every((t, i) => ws.tiles[t as number] === ws.word[i])
}

export { pickPuzzle, formatElapsed } from '../shared'
