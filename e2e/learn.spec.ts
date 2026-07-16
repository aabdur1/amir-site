// E2E — /learn index + artifact page SHELLS only.
//
// Scope notes:
// - Python (09/) and R (10/) load their WASM engines from the network /
//   gitignored assets that are NOT present in this environment. These tests
//   assert only that each page shell and its click-to-load button render —
//   they NEVER click the load button.
// - Artifact components mount late (code-split, several ssr:false), so every
//   assertion is a web-first auto-waiting matcher; the first mount-proving
//   assertion per page gets a generous timeout for dev-server compiles.
import { test as base, expect, type Page } from '@playwright/test'
import { ARTIFACTS, getArtifact } from '../lib/learn/artifacts'

// ---------------------------------------------------------------------------
// Console-error guard
//
// Filtered noise (documented):
//   1. /favicon/i — dev-server favicon 404s; asset noise, not an app error.
//   2. "Failed to load resource: ... 404" — resource-level 404 echoes of the
//      same favicon fetch (Chromium reports these as console errors with no
//      URL in msg.text(), so they can't be attributed more precisely).
// Everything else of severity "error" — including hydration errors, React
// warnings-as-errors, and uncaught page exceptions — fails the test.
// ---------------------------------------------------------------------------
const IGNORED_CONSOLE: RegExp[] = []

const ERROR_BOUNDARY_TEXT = 'Something went wrong loading this section'

interface Fixtures {
  consoleErrors: string[]
}

const test = base.extend<Fixtures>({
  // auto: true — every test gets the listener + the empty-errors assertion
  // on teardown without declaring the fixture.
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return
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

/** Card links on the /learn index: the <a> wrapping each card contains the
 *  artifact title as an <h2> — nothing else on the page nests an h2 in a link. */
function cardLinks(page: Page) {
  return page.locator('a[href^="/learn/"]').filter({ has: page.locator('h2') })
}

function tabBar(page: Page) {
  return page.locator('nav[aria-label="All explainers"]')
}

// ---------------------------------------------------------------------------
// /learn index
// ---------------------------------------------------------------------------

test('learn index renders all artifact cards', async ({ page }) => {
  await page.goto('/learn')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Data Mining Concepts' }),
  ).toBeVisible({ timeout: 15_000 })

  // One card link per artifact — ARTIFACTS is the single source of truth (10).
  await expect(cardLinks(page)).toHaveCount(ARTIFACTS.length)

  // Spot-check a couple of titles.
  await expect(page.getByRole('heading', { level: 2, name: 'Gradient Descent', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Neural Networks', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'R / dplyr', exact: true })).toBeVisible()
})

test('clicking a card navigates to the artifact page with title and tab bar', async ({ page }) => {
  await page.goto('/learn')

  const gdCard = cardLinks(page).filter({
    has: page.getByRole('heading', { level: 2, name: 'Gradient Descent', exact: true }),
  })
  await gdCard.click()

  await expect(page).toHaveURL('/learn/gradient-descent')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Gradient Descent', exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  // Tab bar: one pill per artifact, current one marked with aria-current.
  await expect(tabBar(page)).toBeVisible()
  await expect(tabBar(page).getByRole('link')).toHaveCount(ARTIFACTS.length)
  await expect(tabBar(page).locator('a[aria-current="page"]')).toHaveText('Gradient Descent')
})

// ---------------------------------------------------------------------------
// Deterministic / SSR artifact shell (gradient-descent)
// ---------------------------------------------------------------------------

test('gradient-descent renders its first section and an interactive canvas', async ({ page }) => {
  await page.goto('/learn/gradient-descent')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Gradient Descent', exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  // First section heading (stable id from artifacts.ts sections[0]).
  await expect(page.locator('h2#gd-why-gradients')).toBeVisible()
  await expect(page.locator('h2#gd-why-gradients')).toHaveText('Why Gradients Point Downhill')

  // Its interactive canvas (scoped to the section — the site-wide LivingField
  // canvas also exists on every page, so don't match globally).
  await expect(
    page.locator('section[aria-labelledby="gd-why-gradients"] canvas'),
  ).toBeVisible()

  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// More artifacts render their shell without hitting the error boundary
// ---------------------------------------------------------------------------

for (const slug of ['pca', 'neural-networks', 'clustering'] as const) {
  test(`${slug} renders title + first section without the error boundary`, async ({ page }) => {
    const artifact = getArtifact(slug)!
    await page.goto(`/learn/${slug}`)

    // These load ssr:false — the h1 lives inside the artifact component and
    // only appears after the code-split chunk mounts.
    await expect(
      page.getByRole('heading', { level: 1, name: artifact.title, exact: true }),
    ).toBeVisible({ timeout: 15_000 })

    // First section h2 by its stable id from the metadata array.
    await expect(page.locator(`h2#${artifact.sections[0].id}`)).toBeVisible()

    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
  })
}

// ---------------------------------------------------------------------------
// Section rail (xl-only — visible at the 1280px default viewport)
// ---------------------------------------------------------------------------

test('section rail is visible at 1280px and lists every section', async ({ page }) => {
  await page.goto('/learn/gradient-descent')

  const rail = page.locator('nav[aria-label="Sections on this page"]')
  await expect(rail).toBeVisible({ timeout: 15_000 })

  const gd = getArtifact('gradient-descent')!
  await expect(rail.getByRole('link')).toHaveCount(gd.sections.length)
  await expect(rail.getByRole('link', { name: gd.sections[0].label })).toBeVisible()
})

// ---------------------------------------------------------------------------
// Python (09/) and R (10/) — SHELL ONLY. Never click the load button:
// their engines come from the CDN / gitignored public/webr, absent here.
// ---------------------------------------------------------------------------

test('python page renders its click-to-load shell (button NOT clicked)', async ({ page }) => {
  await page.goto('/learn/python')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Python / pandas', exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  await expect(page.getByRole('button', { name: /Load Python/ })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('nothing downloads until you click Load Python')
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
})

test('r page renders its click-to-load shell (button NOT clicked)', async ({ page }) => {
  await page.goto('/learn/r')

  await expect(
    page.getByRole('heading', { level: 1, name: 'R / dplyr', exact: true }),
  ).toBeVisible({ timeout: 15_000 })

  await expect(page.getByRole('button', { name: /Load R/ })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('nothing downloads until you click Load R')
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
})
