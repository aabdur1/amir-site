// scripts/generate-word-search-puzzles.mjs
// One-off generator for the committed word-search bank behind
// /games/word-search. 90 puzzles (30/difficulty), 8 themes round-robin.
// Deterministic (SEED); output committed; never hand-edit — re-run instead.
// The load-bearing guarantee: every target word is readable at EXACTLY ONE
// straight line in its grid, in either direction — fill letters re-roll
// until that holds, so found-word highlighting is always unambiguous.
//
//   node scripts/generate-word-search-puzzles.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'lib', 'games', 'word-search-puzzles.ts')

const SEED = 11
let s = SEED
const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296)
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))
const shuffle = (arr) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const THEMES = [
  { name: 'In the Kitchen', words: ['SPATULA','WHISK','KETTLE','SKILLET','LADLE','GRATER','TOASTER','BLENDER','OVEN','APRON','RECIPE','SPICES','TIMER','MIXER','TONGS','PANTRY','GRIDDLE','COLANDER','PITCHER','PLATTER','NAPKIN','SAUCER','TEAPOT','BURNER','FREEZER','CUTLERY','PEELER','JUICER'] },
  { name: 'Garden', words: ['TULIP','DAISY','ROSES','SOIL','SHOVEL','TROWEL','MULCH','SEEDS','BLOOM','PETAL','HEDGE','VINES','CLOVER','ORCHID','PANSY','FERNS','ROOTS','SPROUT','GARDENIA','LILAC','PEONY','THORN','POLLEN','NECTAR','TRELLIS','COMPOST','PLANTER','PRUNING'] },
  { name: 'Weather', words: ['BREEZE','CLOUDY','THUNDER','DRIZZLE','RAINBOW','SUNSHINE','FROST','HUMID','STORMY','WINDY','HAIL','FOGGY','CHILLY','MONSOON','TORNADO','BLIZZARD','DEWDROP','ICICLE','PUDDLE','UMBRELLA','FORECAST','SEASONS','AUTUMN','SPRING','WINTER','SUMMER','MISTY','GUSTY'] },
  { name: 'Travel', words: ['PASSPORT','SUITCASE','AIRPORT','JOURNEY','VOYAGE','HOTEL','RESORT','BEACH','CRUISE','TICKET','LUGGAGE','CAMERA','POSTCARD','SOUVENIR','ISLAND','SAFARI','TOURIST','COMPASS','ATLAS','HIGHWAY','TRAIN','SUBWAY','HARBOR','VILLAGE','CASTLE','MUSEUM','MARKET','SUNSET'] },
  { name: 'Animals', words: ['GIRAFFE','ELEPHANT','PENGUIN','DOLPHIN','RACCOON','SQUIRREL','LEOPARD','OSTRICH','PEACOCK','HAMSTER','RABBIT','TURTLE','MONKEY','PARROT','DONKEY','BEAVER','BADGER','WALRUS','JAGUAR','GAZELLE','HEDGEHOG','OTTER','PANDA','KOALA','ZEBRA','MOOSE','BISON','CAMEL'] },
  { name: 'Music', words: ['MELODY','RHYTHM','GUITAR','TRUMPET','VIOLIN','CLARINET','HARMONY','CHORUS','SOPRANO','BALLAD','CONCERT','PIANIST','DRUMMER','WHISTLE','LULLABY','ENCORE','TEMPO','OPERA','BANJO','CELLO','FLUTE','ORGAN','PIANO','SINGER','POLKA','WALTZ','JAZZ','MAESTRO'] },
  { name: 'Baking', words: ['FLOUR','SUGAR','YEAST','DOUGH','ICING','GLAZE','MUFFIN','COOKIE','BROWNIE','CUPCAKE','FROSTING','SPRINKLE','CINNAMON','VANILLA','CARAMEL','PASTRY','STRUDEL','BISCUIT','PRETZEL','CRUST','BATTER','RAISIN','WALNUT','ALMOND','HONEY','COCOA','SCONE','OATMEAL'] },
  { name: 'Around Town', words: ['LIBRARY','BAKERY','MARKET','THEATER','MUSEUM','STATION','AVENUE','PLAZA','CORNER','BRIDGE','FOUNTAIN','SIDEWALK','TRAFFIC','PARADE','FESTIVAL','DINER','FLORIST','BARBER','TAILOR','GROCERY','PHARMACY','SCHOOL','CHAPEL','GAZEBO','BENCH','LANTERN','TROLLEY','MAILBOX'] },
]

const CONFIG = {
  easy: { size: 8, count: 8, dirs: [[0, 1], [1, 0]], prefix: 'we' },
  medium: { size: 10, count: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]], prefix: 'wm' },
  hard: { size: 12, count: 12, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]], prefix: 'wh' },
}
const PER_DIFFICULTY = 30

// --- line scanning (mirrors puzzles.test.ts so gen-time and test agree) ---
function allLines(grid, size) {
  const at = (r, c) => grid[r * size + c]
  const lines = []
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => at(r, c)).join(''))
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => at(r, c)).join(''))
  for (let d = 0; d < 2 * size - 1; d++) {
    let se = ''
    let ne = ''
    for (let r = 0; r < size; r++) {
      const cSE = d - r
      if (cSE >= 0 && cSE < size) se += at(r, size - 1 - cSE)
      const cNE = d - (size - 1 - r)
      if (cNE >= 0 && cNE < size) ne += at(r, cNE)
    }
    if (se.length > 1) lines.push(se)
    if (ne.length > 1) lines.push(ne)
  }
  return lines
}

function occurrences(lines, word) {
  const rev = [...word].reverse().join('')
  let n = 0
  for (const line of lines) {
    for (let i = 0; i + word.length <= line.length; i++) {
      const seg = line.slice(i, i + word.length)
      if (seg === word) n++
      if (seg === rev && rev !== word) n++
    }
  }
  return n
}

// --- sampling: no word may be a substring of another (either direction) in
// the same puzzle, or the exactly-once guarantee is unsatisfiable ---
function sampleWords(theme, size, count) {
  const eligible = theme.words.filter((w) => w.length <= size)
  for (let tries = 0; tries < 200; tries++) {
    const pick = shuffle(eligible).slice(0, count)
    if (pick.length < count) throw new Error(`theme ${theme.name}: not enough words ≤ ${size}`)
    const clash = pick.some((a) =>
      pick.some((b) => {
        if (a === b) return false
        const revB = [...b].reverse().join('')
        return a.includes(b) || a.includes(revB)
      })
    )
    if (!clash) return pick
  }
  throw new Error(`theme ${theme.name}: could not sample ${count} clash-free words`)
}

function buildPuzzle(theme, config) {
  const { size, count, dirs } = config
  outer: for (let puzzleTry = 0; puzzleTry < 100; puzzleTry++) {
    const words = sampleWords(theme, size, count).sort((a, b) => b.length - a.length)
    const cells = new Array(size * size).fill('')
    const placements = []
    for (const word of words) {
      let placed = false
      for (let t = 0; t < 300 && !placed; t++) {
        const [dRow, dCol] = dirs[randInt(0, dirs.length - 1)]
        const lastR = (word.length - 1) * dRow
        const lastC = (word.length - 1) * dCol
        const row = randInt(Math.max(0, -lastR), Math.min(size - 1, size - 1 - lastR))
        const col = randInt(Math.max(0, -lastC), Math.min(size - 1, size - 1 - lastC))
        let ok = true
        for (let k = 0; k < word.length; k++) {
          const existing = cells[(row + k * dRow) * size + (col + k * dCol)]
          if (existing !== '' && existing !== word[k]) { ok = false; break }
        }
        if (!ok) continue
        for (let k = 0; k < word.length; k++) cells[(row + k * dRow) * size + (col + k * dCol)] = word[k]
        placements.push({ word, row, col, dRow, dCol })
        placed = true
      }
      if (!placed) continue outer // repack from a fresh sample
    }
    // Fill from the puzzle's own letter pool (keeps the grid looking themed),
    // re-rolling until no target reads anywhere but its placement.
    const pool = words.join('')
    const empties = cells.map((v, i) => (v === '' ? i : -1)).filter((i) => i >= 0)
    for (let fillTry = 0; fillTry < 300; fillTry++) {
      for (const i of empties) cells[i] = pool[randInt(0, pool.length - 1)]
      const grid = cells.join('')
      const lines = allLines(grid, size)
      if (words.every((w) => occurrences(lines, w) === 1)) {
        return { grid, words: [...words].sort(), placements }
      }
    }
  }
  throw new Error(`could not build a ${config.size}×${config.size} puzzle for ${theme.name}`)
}

// --- generate ---
const puzzles = []
for (const [difficulty, config] of Object.entries(CONFIG)) {
  for (let n = 1; n <= PER_DIFFICULTY; n++) {
    const theme = THEMES[(n - 1) % THEMES.length]
    const built = buildPuzzle(theme, config)
    puzzles.push({
      id: `${config.prefix}${String(n).padStart(2, '0')}`,
      difficulty,
      theme: theme.name,
      size: config.size,
      ...built,
    })
    process.stdout.write(`\r${difficulty} ${n}/${PER_DIFFICULTY}   `)
  }
  process.stdout.write('\n')
}

// --- assertions (generation fails loudly) ---
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`)
}
assert(puzzles.length === 90, 'expected 90 puzzles')
assert(new Set(puzzles.map((p) => p.id)).size === 90, 'ids must be unique')
for (const p of puzzles) {
  const { size, count } = CONFIG[p.difficulty]
  assert(new RegExp(`^[A-Z]{${size * size}}$`).test(p.grid), `${p.id}: grid shape`)
  assert(p.words.length === count && p.placements.length === count, `${p.id}: word count`)
  const lines = allLines(p.grid, size)
  for (const pl of p.placements) {
    const spelled = Array.from(
      { length: pl.word.length },
      (_, k) => p.grid[(pl.row + k * pl.dRow) * size + (pl.col + k * pl.dCol)]
    ).join('')
    assert(spelled === pl.word, `${p.id}: placement ${pl.word}`)
  }
  for (const w of p.words) assert(occurrences(lines, w) === 1, `${p.id}: ${w} not unique`)
}

// --- emit ---
const header = `// lib/games/word-search-puzzles.ts
// GENERATED by scripts/generate-word-search-puzzles.mjs (SEED=${SEED}) — do
// not edit. 90 puzzles, 30 per difficulty, 8 themes round-robin. Every
// target verified at generation time to be readable at exactly one line in
// its grid, either direction. Imported only by the word-search chunk.
import type { WordSearchPuzzle } from './word-search/engine'

export const WORD_SEARCH_PUZZLES: WordSearchPuzzle[] = [
`
const rows = puzzles
  .map((p) => `  { id: '${p.id}', difficulty: '${p.difficulty}', theme: '${p.theme}', size: ${p.size}, grid: '${p.grid}', words: ${JSON.stringify(p.words)}, placements: ${JSON.stringify(p.placements)} },`)
  .join('\n')
writeFileSync(OUT, header + rows + '\n]\n')
console.log(`Wrote ${puzzles.length} puzzles to ${OUT}`)
