// E2E — /gallery photography page.
//
// Scope notes:
// - The page is animation-heavy (count-up subtitle, clip-reveal cards, view
//   transitions), so every assertion is a web-first auto-waiting matcher —
//   no fixed timeouts.
// - The animated count-up digits are aria-hidden; the REAL photo count lives
//   in the adjacent sr-only span, so that's what we assert against.
// - Grid thumbnails and full-res lightbox images come from CloudFront over
//   the network. Assertions are structured so grid/DOM checks never depend
//   on image bytes arriving; only the lightbox image-visible check does, and
//   it gets a generous timeout.
import { test as base, expect, type Page } from '@playwright/test'
import photos from '../public/photos.json'

const BATCH_SIZE = 12

// Mirror of the component's date sort (stable sort over the same source
// order, same comparator) — gives us the expected first lightbox slide.
const byDateDesc = [...photos].sort((a, b) => b.date.localeCompare(a.date))

// Mirror of the component's camera sort — expected first group when sorting
// by Camera, plus that camera's total count (used in the group aria-label).
const firstCamera = photos
  .map((p) => p.camera)
  .sort((a, b) => a.localeCompare(b))[0]
const firstCameraCount = photos.filter((p) => p.camera === firstCamera).length

// ---------------------------------------------------------------------------
// Console-error guard (same pattern as learn.spec.ts)
//
// Filtered noise (documented):
//   1. /favicon/i — dev-server favicon 404s.
//   2. /Failed to load resource/ — the gallery pulls dozens of remote
//      CloudFront images (thumbs via the Next optimizer + full-res in the
//      lightbox); transient network/CDN fetch failures are environment
//      noise, not app errors. Chromium reports them as console errors.
// Everything else of severity "error" — hydration errors, React errors,
// uncaught page exceptions — fails the test.
// ---------------------------------------------------------------------------
const IGNORED_CONSOLE: RegExp[] = [/favicon/i, /Failed to load resource/i]

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

/** Every photo card is a native <button aria-label="Open photo taken on … with …">. */
function photoButtons(page: Page) {
  return page.getByRole('button', { name: /^Open photo taken on/ })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery')
})

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

test('loads with heading and image-count subtitle', async ({ page }) => {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Photography' }),
  ).toBeVisible({ timeout: 15_000 })

  // Subtitle: "N images · <brands>". The visible digits animate from 0
  // (aria-hidden), so assert via the sr-only span carrying the real count.
  const subtitle = page.locator('p').filter({ hasText: 'images' })
  await expect(subtitle).toBeVisible()
  await expect(subtitle.locator('.sr-only')).toHaveText(String(photos.length))
})

// ---------------------------------------------------------------------------
// Sort menu → Camera grouping
// ---------------------------------------------------------------------------

test('sort menu opens, selecting Camera regroups the grid', async ({ page }) => {
  // Default sort is Date.
  const trigger = page.getByRole('button', { name: 'Sort: Date' })
  await expect(trigger).toBeVisible({ timeout: 15_000 })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')

  await trigger.click()

  const menu = page.getByRole('menu', { name: 'Sort photos by' })
  await expect(menu).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  // Four options; the current sort (Date) is marked aria-current.
  await expect(menu.getByRole('menuitem')).toHaveCount(4)
  for (const label of ['Shuffle', 'Date', 'Camera', 'Lens']) {
    await expect(menu.getByRole('menuitem', { name: label })).toBeVisible()
  }
  await expect(menu.getByRole('menuitem', { name: 'Date' })).toHaveAttribute(
    'aria-current',
    'true',
  )

  await menu.getByRole('menuitem', { name: 'Camera' }).click()

  // Menu closes, trigger label updates.
  await expect(menu).toBeHidden()
  const cameraTrigger = page.getByRole('button', { name: 'Sort: Camera' })
  await expect(cameraTrigger).toBeVisible()
  await expect(cameraTrigger).toHaveAttribute('aria-expanded', 'false')

  // Grid regroups into labeled <section aria-label="{label}, {n} photos">.
  const groups = page.locator('section[aria-label$=" photos"]')
  await expect(groups.first()).toBeVisible()

  // First group is the alphabetically-first camera; its aria-label carries
  // that camera's TOTAL count (not just the visible slice).
  await expect(groups.first()).toHaveAttribute(
    'aria-label',
    new RegExp(`, ${firstCameraCount} photos$`),
  )
  // Group header h2 names the camera (brand-prefixed, CSS-uppercased —
  // match case-insensitively on the raw model string).
  await expect(groups.first().locator('h2')).toHaveText(
    new RegExp(escapeRegex(firstCamera), 'i'),
  )
})

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

test('clicking a photo opens the lightbox; Escape closes it', async ({ page }) => {
  const firstPhoto = photoButtons(page).first()
  await expect(firstPhoto).toBeVisible({ timeout: 15_000 })
  await firstPhoto.click()

  // YARL portal overlay.
  const overlay = page.locator('.yarl__root')
  await expect(overlay).toBeVisible()

  // The enlarged image: default sort is date (newest first), so slide 0 is
  // the newest photo's full-res URL. Generous timeout — full-res originals
  // are ~10MB from CloudFront and an <img> has no box until bytes arrive.
  const slideImage = overlay.locator(
    `.yarl__slide_image[src="${byDateDesc[0].url}"]`,
  )
  await expect(slideImage).toBeVisible({ timeout: 30_000 })

  await page.keyboard.press('Escape')
  await expect(overlay).toBeHidden()
})

// ---------------------------------------------------------------------------
// Progressive loading (12 at a time via IntersectionObserver sentinel)
// ---------------------------------------------------------------------------

test('renders 12 photos initially and loads more on scroll', async ({ page }) => {
  // Initial batch: exactly BATCH_SIZE cards in the DOM (sentinel sits well
  // below the fold + its 400px rootMargin at 1280×720, so no early trigger).
  await expect(photoButtons(page)).toHaveCount(BATCH_SIZE, { timeout: 15_000 })

  // Scroll to the bottom until the observer appends the next batch. The
  // poll re-scrolls each attempt so it also covers the pre-hydration window
  // (the observer fires its initial intersection check on attach).
  await expect
    .poll(
      async () => {
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        )
        return photoButtons(page).count()
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(BATCH_SIZE)
})

// ---------------------------------------------------------------------------
// Context menu suppression (right-click disabled on gallery images)
// ---------------------------------------------------------------------------

test('contextmenu is default-prevented inside the grid', async ({ page }) => {
  const firstPhoto = photoButtons(page).first()
  await expect(firstPhoto).toBeVisible({ timeout: 15_000 })

  // Dispatch a real cancelable contextmenu event on a photo card; it bubbles
  // to the grid root's onContextMenu={e => e.preventDefault()}.
  const prevented = await firstPhoto.evaluate((el) => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    el.dispatchEvent(ev)
    return ev.defaultPrevented
  })
  expect(prevented).toBe(true)

  // Control: outside the grid root (document.body itself) the same event is
  // NOT prevented — the suppression is scoped to the gallery grid.
  const controlPrevented = await page.evaluate(() => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    document.body.dispatchEvent(ev)
    return ev.defaultPrevented
  })
  expect(controlPrevented).toBe(false)
})

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
