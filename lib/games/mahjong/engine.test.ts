/**
 * Tests for lib/games/mahjong/engine.ts — pure mahjong-solitaire logic.
 * Geometry (freeSet) is exercised on tiny hand-built layouts where every
 * blocking relationship is checkable by eye. Positions are half-units;
 * a tile's footprint is 2×2.
 */
import {
  KINDS, startGame, removedSet, freeSet,
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
