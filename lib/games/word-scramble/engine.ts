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

// Re-orders only the tray (slots reference tiles by index, so placed tiles
// are untouched). No-op unless the visible letter sequence actually changes.
export function shuffleTray(ws: WordState, rand: () => number = Math.random): WordState {
  const distinct = new Set(ws.tray.map((t) => ws.tiles[t]))
  if (distinct.size < 2) return ws
  for (let i = 0; i < 50; i++) {
    const next = fisherYates(ws.tray, rand)
    if (next.some((t, k) => ws.tiles[t] !== ws.tiles[ws.tray[k]])) {
      return { ...ws, tray: next }
    }
  }
  return ws
}

// Hint: lock the correct letter into the first slot that needs it.
// Already-correct filled slots on the way are locked in passing — the
// player was right; don't spend the reveal on them. Deterministic (no rand).
export function revealLetter(ws: WordState): WordState {
  const slots = ws.slots.slice()
  const locked = ws.locked.slice()
  const tray = ws.tray.slice()

  let target = -1
  for (let i = 0; i < slots.length; i++) {
    if (locked[i]) continue
    const t = slots[i]
    if (t !== null && ws.tiles[t] === ws.word[i]) {
      locked[i] = true
      continue
    }
    target = i
    break
  }

  if (target === -1) {
    // every slot already correct — reveal spends nothing, but keep any
    // in-passing locks it just proved
    return locked.some((l, i) => l !== ws.locked[i]) ? { ...ws, locked } : ws
  }

  const letter = ws.word[target]
  const displaced = slots[target] // wrong tile currently in the target slot, if any
  if (displaced !== null) tray.push(displaced)

  let source = -1
  const trayIdx = tray.findIndex((t) => ws.tiles[t] === letter)
  if (trayIdx !== -1) {
    source = tray[trayIdx]
    tray.splice(trayIdx, 1)
  } else {
    for (let j = 0; j < slots.length; j++) {
      if (j === target || locked[j]) continue
      const t = slots[j]
      if (t !== null && ws.tiles[t] === letter) {
        source = t
        slots[j] = null
        break
      }
    }
  }
  if (source === -1) return ws // unreachable: a needed letter always has a free copy

  slots[target] = source
  locked[target] = true
  return { ...ws, slots, locked, tray }
}

export { pickPuzzle, formatElapsed } from '../shared'
