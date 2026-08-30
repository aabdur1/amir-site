/**
 * Tests for lib/games/mahjong/engine.ts — pure mahjong-solitaire logic.
 * Geometry (freeSet) is exercised on tiny hand-built layouts where every
 * blocking relationship is checkable by eye. Positions are half-units;
 * a tile's footprint is 2×2.
 */
import {
  KINDS, startGame, removedSet, freeSet,
  removePair, undo, hasMoves, isCleared, findHint,
  peelAssign, shuffleRemaining,
  pickPuzzle, formatElapsed,
  type MahjongLayout, type MahjongDeal,
} from '@/lib/games/mahjong/engine'

// A deal over a layout where every position holds kind 0 — geometry tests
// don't care about faces.
function dealFor(layout: MahjongLayout, kinds?: number[]): MahjongDeal {
  return {
    id: 'test', difficulty: 'easy',
    kinds: kinds ?? layout.positions.map(() => 0),
    solution: [],
  }
}

describe('KINDS', () => {
  it('is the 26-kind union of the difficulty pools', () => {
    expect(KINDS).toHaveLength(26)
    expect(new Set(KINDS).size).toBe(26)
    expect(KINDS[0]).toBe('dot-1')
    expect(KINDS[25]).toBe('dragon-w')
  })
})

describe('freeSet geometry', () => {
  it('a lone tile is free; a middle tile in a row of three is side-blocked', () => {
    const row: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    ] }
    const free = freeSet(row, startGame(dealFor(row)))
    expect(free).toEqual(new Set([0, 2])) // ends free, middle blocked both sides
  })

  it('a tile with only one side neighbor is free', () => {
    const pair: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
    ] }
    expect(freeSet(pair, startGame(dealFor(pair)))).toEqual(new Set([0, 1]))
  })

  it('side-blocking needs y-overlap: |dy| = 2 does not block', () => {
    const offset: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 0 },
    ] }
    expect(freeSet(offset, startGame(dealFor(offset)))).toEqual(new Set([0, 1]))
    const halfOverlap: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 4, y: 0, z: 0 },
    ] }
    // middle tile at half-row offset still blocks/is blocked by both
    expect(freeSet(halfOverlap, startGame(dealFor(halfOverlap)))).toEqual(new Set([0, 2]))
  })

  it('a tile covered from above is not free, including half-offset covers', () => {
    const stack: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
    ] }
    expect(freeSet(stack, startGame(dealFor(stack)))).toEqual(new Set([1]))
    const bridge: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 1 },
    ] }
    // the bridging top tile covers BOTH base tiles
    expect(freeSet(bridge, startGame(dealFor(bridge)))).toEqual(new Set([2]))
  })

  it('removed tiles stop blocking and stop covering', () => {
    const stack: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
    ] }
    const s = startGame(dealFor(stack))
    const after = { ...s, removed: [1, 1] } // hand-built: position 1 gone (pair shape irrelevant here)
    expect(freeSet(stack, after)).toEqual(new Set([0]))
  })
})

describe('startGame / removedSet', () => {
  it('copies kinds from the deal and starts with nothing removed', () => {
    const layout: MahjongLayout = { positions: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }] }
    const deal = dealFor(layout, [3, 3])
    const s = startGame(deal)
    expect(s.kinds).toEqual([3, 3])
    expect(s.kinds).not.toBe(deal.kinds) // own copy: shuffleRemaining must not mutate the deal
    expect(s.removed).toEqual([])
    expect(removedSet(s)).toEqual(new Set())
  })
})

describe('re-exports', () => {
  it('pickPuzzle and formatElapsed come from shared', () => {
    expect(typeof pickPuzzle).toBe('function')
    expect(formatElapsed(65)).toBe('1 min')
  })
})

// 2×2 flat square: all four tiles free, kinds paired [0,0,1,1]
const SQUARE: MahjongLayout = { positions: [
  { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 },
  { x: 0, y: 2, z: 0 }, { x: 2, y: 2, z: 0 },
] }
const squareState = () => startGame(dealFor(SQUARE, [0, 0, 1, 1]))

describe('removePair', () => {
  it('removes a free matching pair and records it in order', () => {
    const s = removePair(SQUARE, squareState(), 0, 1)
    expect(s.removed).toEqual([0, 1])
    expect(freeSet(SQUARE, s)).toEqual(new Set([2, 3]))
  })

  it('no-ops (same object) on: same tile, kind mismatch, removed tile, blocked tile', () => {
    const s0 = squareState()
    expect(removePair(SQUARE, s0, 1, 1)).toBe(s0)          // same tile
    expect(removePair(SQUARE, s0, 0, 2)).toBe(s0)          // kinds 0 vs 1
    const s1 = removePair(SQUARE, s0, 0, 1)
    expect(removePair(SQUARE, s1, 0, 1)).toBe(s1)          // already removed
    const row: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
      { x: 0, y: 4, z: 0 },
    ] }
    const rs = startGame(dealFor(row, [0, 0, 0, 0]))
    expect(removePair(row, rs, 1, 3)).toBe(rs)             // middle tile is side-blocked
  })
})

describe('undo / isCleared / hasMoves / findHint', () => {
  it('undo restores the last pair; no-op on empty history', () => {
    const s0 = squareState()
    expect(undo(s0)).toBe(s0)
    const s1 = removePair(SQUARE, s0, 0, 1)
    const s2 = undo(s1)
    expect(s2.removed).toEqual([])
    expect(freeSet(SQUARE, s2).size).toBe(4)
  })

  it('clearing every pair sets isCleared; hasMoves goes false', () => {
    let s = squareState()
    expect(isCleared(s)).toBe(false)
    s = removePair(SQUARE, s, 0, 1)
    s = removePair(SQUARE, s, 2, 3)
    expect(isCleared(s)).toBe(true)
    expect(hasMoves(SQUARE, s)).toBe(false)
  })

  it('findHint returns the first free matching pair in index order', () => {
    expect(findHint(SQUARE, squareState())).toEqual([0, 1])
  })

  it('a full-but-unmatchable free pair is a dead end: hasMoves false, not cleared', () => {
    const pair: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    ] }
    const s = startGame(dealFor(pair, [0, 1])) // both free, kinds differ
    expect(hasMoves(pair, s)).toBe(false)
    expect(isCleared(s)).toBe(false)
    expect(findHint(pair, s)).toBeNull()
  })
})

describe('peelAssign', () => {
  it('produces an assignment whose order replays to cleared via removePair', () => {
    const layout: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 6, y: 0, z: 0 },
      { x: 2, y: 0, z: 1 }, { x: 4, y: 0, z: 1 },
    ] }
    const alive = [0, 1, 2, 3, 4, 5]
    const result = peelAssign(layout, alive, [7, 7, 9], Math.random)
    expect(result).not.toBeNull()
    const kinds = layout.positions.map((_, i) => result!.kinds.get(i)!)
    let s = startGame(dealFor(layout, kinds))
    for (let k = 0; k < result!.order.length; k += 2) {
      const next = removePair(layout, s, result!.order[k], result!.order[k + 1])
      expect(next).not.toBe(s) // every recorded pair must be legal at its turn
      s = next
    }
    expect(isCleared(s)).toBe(true)
  })

  it('wedges (returns null) when geometry forces it: two stacked tiles', () => {
    const stack: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
    ] }
    expect(peelAssign(stack, [0, 1], [0], Math.random)).toBeNull()
  })
})

describe('shuffleRemaining', () => {
  it('reassigns only remaining tiles, preserves the kind multiset, and yields a winnable board', () => {
    const layout: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
      { x: 0, y: 2, z: 0 }, { x: 2, y: 2, z: 0 }, { x: 4, y: 2, z: 0 },
    ] }
    let s = startGame(dealFor(layout, [0, 1, 2, 0, 1, 2]))
    s = removePair(layout, s, 2, 5) // right-edge kind-2 pair — genuinely free
    expect(s.removed).toEqual([2, 5]) // sanity: the removal actually happened
    const before = [0, 1, 3, 4].map((i) => s.kinds[i]).sort()
    const shuffled = shuffleRemaining(layout, s, Math.random)
    expect(shuffled.removed).toEqual(s.removed)               // history survives
    expect(shuffled.kinds[2]).toBe(2)                          // removed keep old kinds
    expect([0, 1, 3, 4].map((i) => shuffled.kinds[i]).sort()).toEqual(before)
    expect(hasMoves(layout, shuffled)).toBe(true)              // winnable-from-here starts with a move
  })

  it('is a no-op with fewer than 4 tiles remaining', () => {
    const pair: MahjongLayout = { positions: [
      { x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    ] }
    const s = startGame(dealFor(pair, [0, 0]))
    expect(shuffleRemaining(pair, s, Math.random)).toBe(s)
  })
})
