// E2E — /games index + sudoku play, resume, notes. Console-error guard
// mirrors e2e/learn.spec.ts (same filtered noise rationale).
// The mistakes-toggle behavior is covered by RTL, not here: asserting a
// wrong digit requires knowing the solution, which the RTL suite reads
// from the bank deterministically and a browser test cannot.
import { test as base, expect } from '@playwright/test'
import { WORD_SEARCH_PUZZLES } from '../lib/games/word-search-puzzles'
import { STORAGE_KEY as WS_KEY } from '../lib/games/word-search/storage'
import { WORD_SCRAMBLE_PUZZLES } from '../lib/games/word-scramble-puzzles'
import { STORAGE_KEY as SCRAMBLE_KEY } from '../lib/games/word-scramble/storage'
import { MAHJONG_DEALS } from '../lib/games/mahjong-deals'
import { MAHJONG_LAYOUTS } from '../lib/games/mahjong-layouts'
import { KINDS as MAHJONG_KINDS } from '../lib/games/mahjong/engine'
import { FACE_NAMES } from '../components/games/mahjong/tile-faces'
import { STORAGE_KEY as MJ_KEY } from '../lib/games/mahjong/storage'

const IGNORED_CONSOLE: RegExp[] = []

interface Fixtures {
  consoleErrors: string[]
}

const test = base.extend<Fixtures>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return
        if (/favicon/i.test(text)) return
        if (/Failed to load resource: .*404/.test(text)) return
        errors.push(`console.error: ${text}`)
      })
      page.on('pageerror', (err) => {
        errors.push(`pageerror: ${err.message}`)
      })
      await use(errors)
      expect(errors, `Unexpected console/page errors:\n${errors.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

test('games index renders the sudoku card, noindexed', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Sudoku' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  // deliberately unlisted — no Games pill in the nav
  await expect(page.locator('nav').getByRole('link', { name: 'Games' })).toHaveCount(0)
})

test('sudoku: tap cell + tap digit places a value that survives reload', async ({ page }) => {
  await page.goto('/games/sudoku')
  const cells = page.locator('[role="gridcell"]')
  await expect(cells).toHaveCount(81, { timeout: 30_000 })

  const empty = page.locator('[role="gridcell"][aria-label$="empty"]').first()
  const label = await empty.getAttribute('aria-label') // "Row r, column c, empty"
  const prefix = label!.replace(/, empty$/, '')
  await empty.click()
  await page.getByRole('button', { name: 'Enter 4' }).click()

  const target = page.locator(`[role="gridcell"][aria-label^="${prefix}, 4"]`)
  await expect(target).toHaveCount(1)

  await page.reload()
  await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 })
  await expect(page.locator(`[role="gridcell"][aria-label^="${prefix}, 4"]`)).toHaveCount(1)
})

test('sudoku: notes mode places pencil marks', async ({ page }) => {
  await page.goto('/games/sudoku')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 })

  await page.getByRole('button', { name: 'Notes' }).click()
  await expect(page.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')

  const empty = page.locator('[role="gridcell"][aria-label$="empty"]').first()
  await empty.click()
  await page.getByRole('button', { name: 'Enter 7' }).click()
  await expect(
    page.locator('[role="gridcell"][aria-label*="notes 7"]').first()
  ).toBeVisible()
})

test('sudoku: new game panel opens with three difficulties', async ({ page }) => {
  await page.goto('/games/sudoku')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 })

  await page.getByRole('button', { name: 'New game' }).click()
  for (const d of ['easy', 'medium', 'hard']) {
    await expect(page.getByRole('button', { name: d, exact: true })).toBeVisible()
  }
})

// Word search — deterministic via addInitScript seeding: the page then
// resumes we01 instead of dealing a random puzzle.
//
// Found-word locator: word-list.tsx renders `{word}<span class="sr-only">, found</span>`
// as siblings inside one <li> (a11y announcement, by design). RTL's getByText
// only reads an element's direct text-node children, so the unit suite can
// match on the bare word — Playwright's getByText concatenates full
// descendant text ("CUTLERY, found") instead, so an exact match on the word
// alone never hits. Scoping to the <li> with a substring hasText sidesteps
// that without touching the (correct) app markup.
const WS_PUZZLE = WORD_SEARCH_PUZZLES[0]
const WS_PLACEMENT = WS_PUZZLE.placements[0]
const wsCellsOf = (p: typeof WS_PLACEMENT) =>
  Array.from({ length: p.word.length }, (_, k) => ({
    row: p.row + k * p.dRow,
    col: p.col + k * p.dCol,
  }))

// addInitScript re-runs on every navigation, including page.reload() (probed
// directly against a throwaway localStorage key: a plain re-seeding script
// stomps the app's own autosave back to the empty-`found` seed on reload,
// every time). A sessionStorage guard makes the seed apply once per page
// session — first goto seeds we01, a later reload sees the app's own
// autosaved localStorage untouched — without weakening determinism on first
// load.
async function seedWordSearch(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('__ws_e2e_seeded')) {
        localStorage.setItem(key, value)
        sessionStorage.setItem('__ws_e2e_seeded', '1')
      }
    },
    [WS_KEY, JSON.stringify({
      puzzleId: WS_PUZZLE.id, found: [], elapsedSeconds: 0, usedIds: [WS_PUZZLE.id],
    })] as const
  )
}

test('word search: drag from first to last letter finds a word', async ({ page }) => {
  await seedWordSearch(page)
  await page.goto('/games/word-search')
  const cells = page.locator('[role="gridcell"]')
  await expect(cells).toHaveCount(WS_PUZZLE.size * WS_PUZZLE.size, { timeout: 30_000 })

  const ends = wsCellsOf(WS_PLACEMENT)
  const firstCell = page.locator(
    `[role="gridcell"][aria-label^="Row ${ends[0].row + 1}, column ${ends[0].col + 1},"]`)
  const lastCell = page.locator(
    `[role="gridcell"][aria-label^="Row ${ends[ends.length - 1].row + 1}, column ${ends[ends.length - 1].col + 1},"]`)
  const a = await firstCell.boundingBox()
  const b = await lastCell.boundingBox()
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2)
  await page.mouse.down()
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 8 })
  await page.mouse.up()

  await expect(page.locator('ul[aria-label="Words to find"] li', { hasText: WS_PLACEMENT.word })).toHaveClass(/line-through/)
})

test('word search: found words survive reload', async ({ page }) => {
  await seedWordSearch(page)
  await page.goto('/games/word-search')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(WS_PUZZLE.size * WS_PUZZLE.size, { timeout: 30_000 })
  const ends = wsCellsOf(WS_PLACEMENT)
  await page.locator(`[role="gridcell"][aria-label^="Row ${ends[0].row + 1}, column ${ends[0].col + 1},"]`).click()
  await page.locator(`[role="gridcell"][aria-label^="Row ${ends[ends.length - 1].row + 1}, column ${ends[ends.length - 1].col + 1},"]`).click()
  await expect(page.locator('ul[aria-label="Words to find"] li', { hasText: WS_PLACEMENT.word })).toHaveClass(/line-through/)
  await page.reload()
  await expect(page.locator('ul[aria-label="Words to find"] li', { hasText: WS_PLACEMENT.word })).toHaveClass(/line-through/, { timeout: 30_000 })
})

test('games index shows the word search card', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Word Search' })).toBeVisible({ timeout: 30_000 })
})

// Word scramble — deterministic via the same sessionStorage-guarded
// addInitScript seeding as word search above.
const SC_PUZZLE = WORD_SCRAMBLE_PUZZLES[0]
const SC_WORD = SC_PUZZLE.words[0]

async function seedWordScramble(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('__sc_e2e_seeded')) {
        localStorage.setItem(key, value)
        sessionStorage.setItem('__sc_e2e_seeded', '1')
      }
    },
    [SCRAMBLE_KEY, JSON.stringify({
      puzzleId: SC_PUZZLE.id, solvedCount: 0, elapsedSeconds: 0, usedIds: [SC_PUZZLE.id],
    })] as const
  )
}

test('word scramble: tapping tiles in order solves the first word', async ({ page }) => {
  await seedWordScramble(page)
  await page.goto('/games/word-scramble')
  const tray = page.locator('[role="group"][aria-label="Letter tiles"]')
  await expect(tray.getByRole('button')).toHaveCount(SC_WORD.length, { timeout: 30_000 })

  for (const ch of SC_WORD) {
    await tray.getByRole('button', { name: `Letter ${ch}`, exact: true }).first().click()
  }
  // after the 600ms beat the word lands in the solved list
  await expect(
    page.locator('ul[aria-label="Solved words"] li', { hasText: SC_WORD })
  ).toBeVisible()
})

test('word scramble: solved words survive reload', async ({ page }) => {
  await seedWordScramble(page)
  await page.goto('/games/word-scramble')
  const tray = page.locator('[role="group"][aria-label="Letter tiles"]')
  await expect(tray.getByRole('button')).toHaveCount(SC_WORD.length, { timeout: 30_000 })
  for (const ch of SC_WORD) {
    await tray.getByRole('button', { name: `Letter ${ch}`, exact: true }).first().click()
  }
  await expect(page.locator('ul[aria-label="Solved words"] li', { hasText: SC_WORD })).toBeVisible()
  await page.reload()
  await expect(
    page.locator('ul[aria-label="Solved words"] li', { hasText: SC_WORD })
  ).toBeVisible({ timeout: 30_000 })
})

test('games index shows the word scramble card', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Word Scramble' })).toBeVisible({ timeout: 30_000 })
})

// Mahjong — deterministic via the same sessionStorage-guarded seeding.
// The full-board test is deliberately exhaustive: Amir has never played
// mahjong, so this is the proof the game is playable end to end.
const MJ_DEAL = MAHJONG_DEALS[0]
const MJ_LAYOUT = MAHJONG_LAYOUTS.easy
const mjLabel = (i: number) => {
  const p = MJ_LAYOUT.positions[i]
  return `${FACE_NAMES[MAHJONG_KINDS[MJ_DEAL.kinds[i]]]}, row ${p.y / 2 + 1}, column ${p.x / 2 + 1}, layer ${p.z + 1}`
}

async function seedMahjong(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('__mj_e2e_seeded')) {
        localStorage.setItem(key, value)
        sessionStorage.setItem('__mj_e2e_seeded', '1')
      }
    },
    [MJ_KEY, JSON.stringify({
      puzzleId: MJ_DEAL.id, removed: [], kinds: null, elapsedSeconds: 0, usedIds: [MJ_DEAL.id],
    })] as const
  )
}

test('mahjong: matching a free pair removes it and survives reload', async ({ page }) => {
  await seedMahjong(page)
  await page.goto('/games/mahjong')
  const board = page.locator('[role="group"][aria-label="Mahjong board"]')
  await expect(board.getByRole('button')).toHaveCount(MJ_DEAL.kinds.length, { timeout: 30_000 })
  await board.getByRole('button', { name: mjLabel(MJ_DEAL.solution[0]), exact: true }).click()
  await board.getByRole('button', { name: mjLabel(MJ_DEAL.solution[1]), exact: true }).click()
  await expect(board.getByRole('button')).toHaveCount(MJ_DEAL.kinds.length - 2)
  await page.reload()
  await expect(
    page.locator('[role="group"][aria-label="Mahjong board"]').getByRole('button')
  ).toHaveCount(MJ_DEAL.kinds.length - 2, { timeout: 30_000 })
})

test('mahjong: the committed solution clears the whole board to the solved panel', async ({ page }) => {
  await seedMahjong(page)
  await page.goto('/games/mahjong')
  const board = page.locator('[role="group"][aria-label="Mahjong board"]')
  await expect(board.getByRole('button')).toHaveCount(MJ_DEAL.kinds.length, { timeout: 30_000 })
  for (let k = 0; k < MJ_DEAL.solution.length; k += 2) {
    await board.getByRole('button', { name: mjLabel(MJ_DEAL.solution[k]), exact: true }).click()
    await board.getByRole('button', { name: mjLabel(MJ_DEAL.solution[k + 1]), exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Board cleared' })).toBeVisible()
})

test('games index shows the mahjong card', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Mahjong' })).toBeVisible({ timeout: 30_000 })
})
