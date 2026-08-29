// E2E — /games index + sudoku play, resume, notes. Console-error guard
// mirrors e2e/learn.spec.ts (same filtered noise rationale).
// The mistakes-toggle behavior is covered by RTL, not here: asserting a
// wrong digit requires knowing the solution, which the RTL suite reads
// from the bank deterministically and a browser test cannot.
import { test as base, expect } from '@playwright/test'

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
