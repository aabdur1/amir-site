import { test, expect, type Page } from '@playwright/test'

/**
 * E2E: site navigation + dark-mode theming.
 *
 * Theme contract (components/dark-mode-toggle.tsx + app/layout.tsx):
 * - The toggle <button>'s accessible name is "Switch to dark mode" in light
 *   mode and "Switch to light mode" in dark mode.
 * - Toggling flips the `dark` class on <html> and persists to
 *   localStorage under the key "theme" ("dark" / "light").
 * - A blocking inline <head> script applies the stored theme before first
 *   paint, so after a reload the class is already correct at
 *   DOMContentLoaded — no flash of wrong theme.
 * - The toggle animates via the View Transitions API; all assertions here
 *   target the END state (class + localStorage), never the animation.
 */

const DARK_CLASS = /\bdark\b/

const themeValue = (dark: boolean) => (dark ? 'dark' : 'light')
const toggleName = (dark: boolean) =>
  dark ? 'Switch to light mode' : 'Switch to dark mode'

/** The sticky top nav (first <nav> in DOM order — before <main>/footer). */
const topNav = (page: Page) => page.locator('nav').first()

/** Theme toggle button, matched in either state. */
const themeToggle = (page: Page) =>
  topNav(page).getByRole('button', { name: /switch to (dark|light) mode/i })

async function expectHtmlDark(page: Page, dark: boolean) {
  const html = page.locator('html')
  if (dark) {
    await expect(html).toHaveClass(DARK_CLASS)
  } else {
    await expect(html).not.toHaveClass(DARK_CLASS)
  }
}

async function expectStoredTheme(page: Page, value: string) {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('theme')))
    .toBe(value)
}

test.describe('dark mode', () => {
  test('toggle flips <html> class, persists to localStorage, survives reload without a flash, and toggles back', async ({
    page,
  }) => {
    // Record the <html> class state at DOMContentLoaded on every navigation.
    // The blocking head script runs before DCL, but React hydration runs
    // after — so this captures the first-paint theme, proving no flash.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        ;(window as unknown as { __darkAtDCL?: boolean }).__darkAtDCL =
          document.documentElement.classList.contains('dark')
      })
    })

    await page.goto('/')

    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    const flipped = !initialDark

    // Wait for hydration: the server render always assumes light mode, so the
    // label only reliably reflects the real theme once React has taken over.
    // This both gates the click on hydration and verifies the label text.
    await expect(themeToggle(page)).toHaveAccessibleName(toggleName(initialDark))

    // Toggle: class flips and the choice is persisted.
    await themeToggle(page).click()
    await expectHtmlDark(page, flipped)
    await expectStoredTheme(page, themeValue(flipped))
    await expect(themeToggle(page)).toHaveAccessibleName(toggleName(flipped))

    // Reload: theme persists, and the class was already correct at
    // DOMContentLoaded (blocking head script) — no flash of wrong theme.
    await page.reload()
    await expectHtmlDark(page, flipped)
    const darkAtFirstPaint = await page.evaluate(
      () => (window as unknown as { __darkAtDCL?: boolean }).__darkAtDCL,
    )
    expect(darkAtFirstPaint).toBe(flipped)
    await expectStoredTheme(page, themeValue(flipped))

    // Toggle back (again gated on hydration via the label).
    await expect(themeToggle(page)).toHaveAccessibleName(toggleName(flipped))
    await themeToggle(page).click()
    await expectHtmlDark(page, initialDark)
    await expectStoredTheme(page, themeValue(initialDark))
  })

  test('toggle button has a non-empty accessible name', async ({ page }) => {
    await page.goto('/')
    await expect(themeToggle(page)).toHaveAccessibleName(
      /switch to (dark|light) mode/i,
    )
  })
})

test.describe('navigation', () => {
  test('nav pills and wordmark navigate between home, learn, and gallery with aria-current', async ({
    page,
  }) => {
    await page.goto('/')

    const learnPill = topNav(page).getByRole('link', { name: 'Learn', exact: true })
    const galleryPill = topNav(page).getByRole('link', {
      name: 'Gallery',
      exact: true,
    })
    const wordmark = topNav(page).getByRole('link', { name: 'Amir Abdur-Rahim' })

    await expect(learnPill).toHaveAttribute('href', '/learn')
    await expect(galleryPill).toHaveAttribute('href', '/gallery')
    await expect(wordmark).toHaveAttribute('href', '/')

    // Neither pill is current on the homepage.
    await expect(learnPill).not.toHaveAttribute('aria-current', 'page')
    await expect(galleryPill).not.toHaveAttribute('aria-current', 'page')

    // Learn pill → /learn
    await learnPill.click()
    await expect(page).toHaveURL(/\/learn$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Data Mining Concepts' }),
    ).toBeVisible()
    await expect(learnPill).toHaveAttribute('aria-current', 'page')
    await expect(galleryPill).not.toHaveAttribute('aria-current', 'page')

    // Gallery pill → /gallery
    await galleryPill.click()
    await expect(page).toHaveURL(/\/gallery$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Photography' }),
    ).toBeVisible()
    await expect(galleryPill).toHaveAttribute('aria-current', 'page')
    await expect(learnPill).not.toHaveAttribute('aria-current', 'page')

    // Wordmark → back home
    await wordmark.click()
    await expect(page).toHaveURL('/')
    await expect(learnPill).not.toHaveAttribute('aria-current', 'page')
    await expect(galleryPill).not.toHaveAttribute('aria-current', 'page')
  })
})

test.describe('skip link', () => {
  test('is sr-only until focused, then becomes visible and targets #main-content', async ({
    page,
  }) => {
    await page.goto('/')

    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toHaveAttribute('href', '#main-content')

    // Before focus: sr-only (absolutely positioned, clipped to 1px).
    await expect(skipLink).toHaveCSS('position', 'absolute')

    // First Tab stop from the top of the page is the skip link.
    await page.keyboard.press('Tab')
    await expect(skipLink).toBeFocused()

    // Focus promotes it out of sr-only: fixed position with a real box.
    await expect(skipLink).toHaveCSS('position', 'fixed')
    await expect
      .poll(async () => (await skipLink.boundingBox())?.width ?? 0)
      .toBeGreaterThan(10)

    // Its target exists as the <main> landmark.
    await expect(page.locator('main#main-content')).toBeVisible()
  })
})
