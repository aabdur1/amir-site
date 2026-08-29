/**
 * Tests for lib/games/word-scramble/engine.ts — pure word-scramble logic.
 * Slots hold tile INDEXES (identity), so duplicate letters are
 * interchangeable for correctness but distinct for placement.
 */
import {
  scrambleOrder, startWord, placeTile, returnSlot, returnAll,
  isFilled, isCorrect, pickPuzzle, formatElapsed,
  shuffleTray, revealLetter,
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

describe('shuffleTray', () => {
  it('changes the tray letter sequence and leaves placed tiles alone', () => {
    let ws = startWord('SPROUT')
    ws = placeTile(ws, ws.tray[0])
    const placed = ws.slots[0]
    const before = ws.tray.map((t) => ws.tiles[t]).join('')
    const next = shuffleTray(ws, Math.random)
    expect(next.slots[0]).toBe(placed)
    expect([...next.tray].sort((a, b) => a - b)).toEqual([...ws.tray].sort((a, b) => a - b))
    expect(next.tray.map((t) => next.tiles[t]).join('')).not.toBe(before)
  })

  it('is a no-op when fewer than two distinct unplaced letters remain', () => {
    let ws = startWord('SEEDS')
    // place S, D, S — leaving only the two Es in the tray
    for (const ch of ['S', 'D', 'S']) {
      ws = placeTile(ws, ws.tray.find((t) => ws.tiles[t] === ch)!)
    }
    expect(ws.tray.map((t) => ws.tiles[t]).sort().join('')).toBe('EE')
    expect(shuffleTray(ws, Math.random)).toBe(ws)
  })
})

describe('revealLetter', () => {
  it('locks the correct letter into the first empty slot, from the tray', () => {
    const ws = startWord('HONEY')
    const next = revealLetter(ws)
    expect(next.locked[0]).toBe(true)
    expect(next.tiles[next.slots[0]!]).toBe('H')
    expect(next.tray).toHaveLength(4)
  })

  it('displaces a wrong tile from the target slot back to the tray', () => {
    let ws = startWord('HONEY')
    const wrong = ws.tray.find((t) => ws.tiles[t] !== 'H')!
    ws = placeTile(ws, wrong) // wrong letter sits in slot 0
    const next = revealLetter(ws)
    expect(next.tiles[next.slots[0]!]).toBe('H')
    expect(next.locked[0]).toBe(true)
    expect(next.tray).toContain(wrong)
  })

  it('locks an already-correct filled slot in passing instead of spending the reveal on it', () => {
    let ws = startWord('HONEY')
    ws = placeTile(ws, ws.tray.find((t) => ws.tiles[t] === 'H')!) // slot 0 correct, unlocked
    const next = revealLetter(ws)
    expect(next.locked[0]).toBe(true)            // locked in passing
    expect(next.locked[1]).toBe(true)            // the actual reveal
    expect(next.tiles[next.slots[1]!]).toBe('O')
  })

  it('evicts the needed letter from a later unlocked slot when the tray has none', () => {
    let ws = startWord('SOIL')
    // fill everything wrong such that no tray tiles remain
    const order = ['O', 'S', 'L', 'I'] // slot0=O (wrong; needs S)
    for (const ch of order) {
      ws = placeTile(ws, ws.tray.find((t) => ws.tiles[t] === ch)!)
    }
    expect(ws.tray).toHaveLength(0)
    const next = revealLetter(ws)
    expect(next.tiles[next.slots[0]!]).toBe('S')
    expect(next.locked[0]).toBe(true)
    // the S came out of slot 1; the displaced O went back to the tray
    expect(next.slots[1]).toBeNull()
    expect(next.tray.map((t) => next.tiles[t]).sort().join('')).toBe('O')
  })

  it('repeated reveals solve the whole word', () => {
    let ws = startWord('SPROUT')
    for (let i = 0; i < 6; i++) ws = revealLetter(ws)
    expect(isCorrect(ws)).toBe(true)
    expect(ws.locked.every(Boolean)).toBe(true)
    expect(revealLetter(ws)).toBe(ws) // fully locked => no-op
  })
})
