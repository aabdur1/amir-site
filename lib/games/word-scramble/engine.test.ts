/**
 * Tests for lib/games/word-scramble/engine.ts — pure word-scramble logic.
 * Slots hold tile INDEXES (identity), so duplicate letters are
 * interchangeable for correctness but distinct for placement.
 */
import {
  scrambleOrder, startWord, placeTile, returnSlot, returnAll,
  isFilled, isCorrect, pickPuzzle, formatElapsed,
} from '@/lib/games/word-scramble/engine'

describe('scrambleOrder', () => {
  it('returns a permutation of all tile indexes whose letters differ from the word', () => {
    const order = scrambleOrder('SPROUT', Math.random)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
    expect(order.map((t) => 'SPROUT'[t]).join('')).not.toBe('SPROUT')
  })

  it('re-rolls duplicate-letter words until the LETTER sequence differs', () => {
    // 20 tries at random: every result must spell something ≠ SEEDS
    for (let i = 0; i < 20; i++) {
      const order = scrambleOrder('SEEDS', Math.random)
      expect(order.map((t) => 'SEEDS'[t]).join('')).not.toBe('SEEDS')
    }
  })
})

describe('startWord', () => {
  it('builds tiles in word order, a scrambled tray, empty unlocked slots', () => {
    const ws = startWord('HONEY')
    expect(ws.word).toBe('HONEY')
    expect(ws.tiles).toEqual(['H', 'O', 'N', 'E', 'Y'])
    expect([...ws.tray].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
    expect(ws.slots).toEqual([null, null, null, null, null])
    expect(ws.locked).toEqual([false, false, false, false, false])
  })
})

describe('placeTile / returnSlot / returnAll', () => {
  it('places a tray tile into the lowest empty slot and removes it from the tray', () => {
    const ws = startWord('HONEY')
    const t = ws.tray[0]
    const next = placeTile(ws, t)
    expect(next.slots[0]).toBe(t)
    expect(next.tray).not.toContain(t)
    expect(next.tray).toHaveLength(4)
  })

  it('is a no-op (same object) for an already-placed tile', () => {
    const ws = placeTile(startWord('HONEY'), 0)
    expect(placeTile(ws, 0)).toBe(ws)
  })

  it('returnSlot sends the tile back to the tray; no-op on empty slots', () => {
    let ws = startWord('HONEY')
    const t = ws.tray[0]
    ws = placeTile(ws, t)
    const back = returnSlot(ws, 0)
    expect(back.slots[0]).toBeNull()
    expect(back.tray).toContain(t)
    expect(returnSlot(back, 0)).toBe(back)
  })

  it('returnSlot refuses locked slots', () => {
    let ws = startWord('HONEY')
    ws = placeTile(ws, ws.tray[0])
    const lockedWs = { ...ws, locked: ws.locked.map((_, i) => i === 0) }
    expect(returnSlot(lockedWs, 0)).toBe(lockedWs)
  })

  it('returnAll clears every unlocked slot, keeps locked ones, no-op when nothing to clear', () => {
    let ws = startWord('HONEY')
    ws = placeTile(ws, ws.tray[0])
    ws = placeTile(ws, ws.tray[0])
    const withLock = { ...ws, locked: ws.locked.map((_, i) => i === 0) }
    const cleared = returnAll(withLock)
    expect(cleared.slots[0]).toBe(withLock.slots[0]) // locked survives
    expect(cleared.slots[1]).toBeNull()
    expect(cleared.tray).toHaveLength(4) // 5 tiles - 1 locked
    expect(returnAll(cleared)).toBe(cleared)
  })
})

describe('isFilled / isCorrect', () => {
  // Place tiles to spell the word exactly: for each target letter take a
  // tray tile carrying that letter.
  function solve(word: string) {
    let ws = startWord(word)
    for (const ch of word) {
      const tile = ws.tray.find((t) => ws.tiles[t] === ch)!
      ws = placeTile(ws, tile)
    }
    return ws
  }

  it('a correctly spelled fill is filled and correct — duplicate letters interchangeable', () => {
    const ws = solve('SEEDS') // which E/S tile lands where is arbitrary
    expect(isFilled(ws)).toBe(true)
    expect(isCorrect(ws)).toBe(true)
  })

  it('a full but wrong arrangement is filled, not correct', () => {
    let ws = startWord('HONEY')
    // fill slots in tray order — with a scramble ≠ word this can still
    // accidentally spell the word, so force a wrong arrangement: place the
    // tile for the LAST letter first.
    const lastTile = ws.tray.find((t) => ws.tiles[t] === 'Y')!
    ws = placeTile(ws, lastTile)
    while (ws.tray.length > 0) ws = placeTile(ws, ws.tray[0])
    expect(isFilled(ws)).toBe(true)
    expect(isCorrect(ws)).toBe(false)
  })

  it('an unfilled word is neither', () => {
    const ws = placeTile(startWord('HONEY'), 0)
    expect(isFilled(ws)).toBe(false)
    expect(isCorrect(ws)).toBe(false)
  })
})

describe('re-exports', () => {
  it('pickPuzzle and formatElapsed come from shared', () => {
    expect(typeof pickPuzzle).toBe('function')
    expect(formatElapsed(65)).toBe('1 min')
  })
})
