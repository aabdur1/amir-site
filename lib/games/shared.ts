// Cross-game helpers. Each game's engine re-exports what it uses so game
// code never imports another game's engine.

// Random puzzle of a difficulty, avoiding already-played ids. When the
// difficulty is exhausted its used entries reset (other difficulties keep
// theirs). Returns the updated used list alongside the pick.
export function pickPuzzle<T extends { id: string; difficulty: string }>(
  puzzles: T[],
  difficulty: T['difficulty'],
  usedIds: string[],
  rand: () => number = Math.random
): { puzzle: T; usedIds: string[] } {
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
