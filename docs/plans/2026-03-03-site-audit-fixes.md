# Site Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 40+ findings from the performance, security, accessibility, and SEO audit.

**Architecture:** Batch edits by file proximity — each task touches 1-3 related files, builds on the last, and results in a passing build. No new dependencies. No component library additions.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Netlify

**Security note:** The plan includes two uses of `dangerouslySetInnerHTML` — both contain ONLY hardcoded string literals (JSON-LD schema and existing dark mode script). No user input flows into these strings. This is the standard Next.js pattern for injecting JSON-LD structured data and inline scripts.

---

### Task 1: Add `<main>` landmark, skip link, and improved fallback description to layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Edit layout.tsx**

1. Improve the root metadata description (line 42):

Replace:
```tsx
  description: 'Personal site of Amir Abdur-Rahim.',
```
With:
```tsx
  description: 'Amir Abdur-Rahim — software engineer, healthcare technologist, and photographer. MS in MIS at UIC. Chicago.',
```

2. Add skip link and `<main>` wrapper. Replace the `<body>` block (lines 67-72):

Replace:
```tsx
      <body>
        <ScrollProgress />
        <Nav />
        {children}
        <Footer />
      </body>
```
With:
```tsx
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[10000] focus:top-4 focus:left-4
            focus:px-4 focus:py-2 focus:bg-cream focus:dark:bg-night focus:text-ink focus:dark:text-night-text
            focus:rounded-lg focus:shadow-card focus:outline-2 focus:outline-mauve focus:dark:outline-mauve-dark"
        >
          Skip to main content
        </a>
        <ScrollProgress />
        <Nav />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no new errors.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "a11y: add skip link, <main> landmark, and improve fallback description"
```

---

### Task 2: Create sitemap.ts and robots.ts

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

**Step 1: Create app/sitemap.ts**

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://amirabdurrahim.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://amirabdurrahim.com/gallery',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]
}
```

**Step 2: Create app/robots.ts**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://amirabdurrahim.com/sitemap.xml',
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. Routes `/sitemap.xml` and `/robots.txt` appear in output.

**Step 4: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "seo: add sitemap.xml and robots.txt"
```

---

### Task 3: Add security headers (CSP, HSTS, cache headers)

**Files:**
- Modify: `netlify.toml`

**Step 1: Edit netlify.toml**

Replace the entire `[[headers]]` block with:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'sha256-FzZqltVqNEMe1AP7MNJyYU92WT6Smm3z6p9+mEkOLu0='; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https://d36t8s1mzbufg5.cloudfront.net https://images.credly.com; connect-src 'self' https://www.credly.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

[[headers]]
  for = "/badges/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Step 2: Commit**

```bash
git add netlify.toml
git commit -m "security: add CSP, HSTS, and cache headers"
```

---

### Task 4: Add aria-hidden to decorative elements

**Files:**
- Modify: `components/section-divider.tsx`
- Modify: `components/footer.tsx`

**Step 1: Edit section-divider.tsx**

Add `aria-hidden="true"` to the outer div. Replace line 12-13:

```tsx
    <div
      className={`flex items-center justify-center gap-3 ${
```

With:

```tsx
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-3 ${
```

**Step 2: Edit footer.tsx**

Add `aria-hidden="true"` to both diamond separator spans (lines 46 and 60). Both instances of:
```tsx
            <span className="text-cream-border dark:text-night-border text-[10px]">&#9670;</span>
```
Become:
```tsx
            <span aria-hidden="true" className="text-cream-border dark:text-night-border text-[10px]">&#9670;</span>
```

**Step 3: Commit**

```bash
git add components/section-divider.tsx components/footer.tsx
git commit -m "a11y: hide decorative diamond ornaments from screen readers"
```

---

### Task 5: Add aria-labelledby to all section elements

**Files:**
- Modify: `components/section-header.tsx`
- Modify: `components/hero.tsx`
- Modify: `components/experience.tsx`
- Modify: `components/projects.tsx`
- Modify: `components/certifications.tsx`
- Modify: `components/skills.tsx`
- Modify: `components/education.tsx`

**Step 1: Add id to SectionHeader h2**

In `components/section-header.tsx`, replace line 19:

```tsx
      <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-ink dark:text-night-text">
```

With:

```tsx
      <h2 id={`section-${number}`} className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-ink dark:text-night-text">
```

**Step 2: Add aria-labelledby to each section component**

In `components/experience.tsx` line 11, replace:
```tsx
    <section ref={sectionRef} className="relative py-20 sm:py-28">
```
With:
```tsx
    <section ref={sectionRef} aria-labelledby="section-01" className="relative py-20 sm:py-28">
```

In `components/projects.tsx` lines 57-60, add `aria-labelledby="section-02"` after `ref={sectionRef}`.

In `components/certifications.tsx` lines 24-27, add `aria-labelledby="section-03"` after `ref={sectionRef}`.

In `components/skills.tsx` line 40, add `aria-labelledby="section-04"` after `ref={sectionRef}`.

In `components/education.tsx` lines 11-14, add `aria-labelledby="section-05"` after `ref={sectionRef}`.

In `components/hero.tsx` lines 102-104, add `aria-label="Introduction"` after `ref={sectionRef}`.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add components/section-header.tsx components/hero.tsx components/experience.tsx components/projects.tsx components/certifications.tsx components/skills.tsx components/education.tsx
git commit -m "a11y: add accessible names to all section landmarks"
```

---

### Task 6: Fix SEO metadata (titles, canonical URLs, Twitter card, OG improvements, 404)

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/gallery/page.tsx`
- Modify: `app/not-found.tsx`
- Modify: `app/opengraph-image.tsx`
- Modify: `app/gallery/opengraph-image.tsx`

**Step 1: Fix app/page.tsx metadata**

Replace the entire metadata export (lines 11-25):

```tsx
export const metadata: Metadata = {
  title: { absolute: 'Amir Abdur-Rahim — Healthcare Meets Technology' },
  description: 'Healthcare meets technology. Chicago.',
  alternates: {
    canonical: 'https://amirabdurrahim.com',
  },
  openGraph: {
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
    url: 'https://amirabdurrahim.com',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
  },
}
```

**Step 2: Fix app/gallery/page.tsx metadata**

Replace the metadata export (lines 7-18):

```tsx
export const metadata: Metadata = {
  title: 'Photography',
  description:
    'Photography portfolio by Amir Abdur-Rahim. Landscape and street photography from Chicago and beyond.',
  alternates: {
    canonical: 'https://amirabdurrahim.com/gallery',
  },
  openGraph: {
    title: 'Photography — Amir Abdur-Rahim',
    description:
      'Photography portfolio featuring landscape and street work.',
    url: 'https://amirabdurrahim.com/gallery',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Photography — Amir Abdur-Rahim',
    description: 'Photography portfolio featuring landscape and street work.',
  },
}
```

**Step 3: Add metadata to app/not-found.tsx**

Add after line 2 (after the PageTransition import):

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you were looking for does not exist.',
  robots: { index: false },
}
```

**Step 4: Improve OG image alt text**

In `app/opengraph-image.tsx` line 3, replace:
```tsx
export const alt = 'Amir Abdur-Rahim'
```
With:
```tsx
export const alt = 'Amir Abdur-Rahim — Healthcare meets technology. Chicago.'
```

In `app/gallery/opengraph-image.tsx` line 3, replace:
```tsx
export const alt = 'Photography — Amir Abdur-Rahim'
```
With:
```tsx
export const alt = 'Photography portfolio by Amir Abdur-Rahim — landscape and street photography.'
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add app/page.tsx app/gallery/page.tsx app/not-found.tsx app/opengraph-image.tsx app/gallery/opengraph-image.tsx
git commit -m "seo: fix title template, add canonical URLs, Twitter card, OG improvements, 404 metadata"
```

---

### Task 7: Fix theme transition reduced-motion override and localStorage guard

**Files:**
- Modify: `components/dark-mode-toggle.tsx`
- Modify: `app/globals.css`

**Step 1: Guard theme-transitioning behind reduced-motion check**

In `components/dark-mode-toggle.tsx`, replace the toggle callback (lines 41-56):

```tsx
  const toggle = useCallback(() => {
    const html = document.documentElement;
    const next = !html.classList.contains("dark");
    // Only animate theme transition if user hasn't opted out of motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      html.classList.add("theme-transitioning");
      setTimeout(() => html.classList.remove("theme-transitioning"), 350);
    }
    html.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be full or unavailable
    }
    // Trigger the swap animation by bumping the key
    swapKeyRef.current += 1;
    if (iconRef.current) {
      iconRef.current.classList.remove("dark-toggle-swap-enter");
      void iconRef.current.offsetWidth;
      iconRef.current.classList.add("dark-toggle-swap-enter");
    }
  }, []);
```

**Step 2: Remove redundant permanent body transition**

In `app/globals.css`, remove the transition property from the body rule so it becomes:

```css
body {
  font-family: var(--font-body), system-ui, sans-serif;
  background-color: var(--color-cream);
  color: var(--color-ink);
  overflow-x: hidden;
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add components/dark-mode-toggle.tsx app/globals.css
git commit -m "a11y: respect prefers-reduced-motion for theme transitions, guard localStorage"
```

---

### Task 8: Fix PageTransition reduced-motion flash

**Files:**
- Modify: `components/page-transition.tsx`

**Step 1: Replace useState with useSyncExternalStore for reduced-motion**

Replace the entire file:

```tsx
'use client'

import React, { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

// Module-level Set persists across navigations within the SPA session,
// but resets on hard refresh (full page reload).
const visitedPages = new Set<string>()

function subscribeToMotionPreference(callback: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getMotionSnapshot(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getMotionServerSnapshot(): boolean {
  return false
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasVisited = visitedPages.has(pathname)
  const items = React.Children.toArray(children)
  const prefersReduced = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionSnapshot,
    getMotionServerSnapshot
  )

  useEffect(() => {
    visitedPages.add(pathname)
  }, [pathname])

  // Reduced motion: render immediately without opacity:0 start state
  if (prefersReduced) {
    return <>{children}</>
  }

  // Return visit: quick uniform fade-in, no stagger, no translateY
  if (hasVisited) {
    return (
      <>
        {items.map((child, i) => (
          <div
            key={i}
            style={{
              opacity: 0,
              animation: 'fade-in 200ms ease-out forwards',
            }}
          >
            {child}
          </div>
        ))}
      </>
    )
  }

  // First visit: staggered fade-in-up (120ms between each child)
  return (
    <>
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: 0,
            animation: `fade-in-up 600ms ease-out ${i * 120}ms forwards`,
          }}
        >
          {child}
        </div>
      ))}
    </>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add components/page-transition.tsx
git commit -m "a11y: use useSyncExternalStore for reduced-motion detection in PageTransition"
```

---

### Task 9: Fix gallery accessibility (lightbox alt, photo card, sort controls, scroll indicator)

**Files:**
- Modify: `components/gallery/masonry-grid.tsx`
- Modify: `components/gallery/photo-card.tsx`
- Modify: `components/gallery/sort-controls.tsx`
- Modify: `components/hero.tsx`

**Step 1: Add alt to lightbox slides and memoize**

In `components/gallery/masonry-grid.tsx`:

1. Add `useMemo` to imports (line 3)
2. Wrap `sortedPhotos` in `useMemo`
3. Add `photoByUrl` lookup map via `useMemo`
4. Add `slides` array with `alt` text via `useMemo`
5. Update `Lightbox` to use `slides` and `photoByUrl`

See the full replacement code in the design document. Key changes:
- `slides` now include `alt` per photo: `Photograph by Amir Abdur-Rahim, ${photo.date} — ${photo.camera}, ${photo.lens}`
- `slideFooter` uses O(1) `photoByUrl[slide.src]` instead of O(n) `.find()`

**Step 2: Improve photo-card.tsx — change div to button, improve alt text**

Replace `<div>` with `<button>` element, update ref type to `HTMLButtonElement`, add `type="button"` and `text-left w-full`, remove `role`, `tabIndex`, and `onKeyDown` (native button handles these). Update image alt to include camera and lens info.

**Step 3: Fix sort-controls.tsx**

Key changes:
- Only attach `mousedown` listener when `isOpen` is true (add `[isOpen]` dep)
- Add `{ passive: true }` to the document listener
- Add `onBlur` handler to close dropdown when focus leaves container
- Add `aria-controls="sort-menu"` on trigger, `id="sort-menu"` on menu
- Remove `aria-activedescendant` from menu div (using roving focus pattern instead)

**Step 4: Fix scroll indicator contrast in hero.tsx**

Replace `text-[11px]` with `text-[12px]` and `text-lavender/50` with `text-lavender/70` (both light and dark).

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add components/gallery/masonry-grid.tsx components/gallery/photo-card.tsx components/gallery/sort-controls.tsx components/hero.tsx
git commit -m "a11y: fix lightbox alt text, photo card semantics, sort controls ARIA, scroll indicator contrast"
```

---

### Task 10: Fix AnimatedText progressive enhancement

**Files:**
- Modify: `components/animated-text.tsx`

**Step 1: Render visible by default, animate only after hydration**

Move `opacity: 0` inside the `hydrated` branch so server-rendered HTML shows text at full opacity:

```tsx
style={{
  display: "inline-block",
  marginRight: "0.3em",
  ...(hydrated
    ? {
        opacity: 0,
        animation: `fade-in-up 0.6s ease-out ${delay + index * 100}ms forwards`,
      }
    : {}),
}}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add components/animated-text.tsx
git commit -m "a11y: render h1 text visible by default, animate only after hydration"
```

---

### Task 11: Fix HeroSpeckles double-render

**Files:**
- Modify: `components/hero-speckles.tsx`

**Step 1: Initialize dot count to 0**

Replace `useState(DOT_COUNT_REF)` with `useState(0)` so no dots render until viewport is measured.

**Step 2: Verify build and commit**

```bash
git add components/hero-speckles.tsx
git commit -m "perf: fix HeroSpeckles double-render — init with 0 dots, measure once"
```

---

### Task 12: Remove unused Lora font weight

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Change Lora weight from `["400", "500"]` to `"400"`**

**Step 2: Verify build and commit**

```bash
git add app/layout.tsx
git commit -m "perf: remove unused Lora 500 weight — saves 2 font file requests"
```

---

### Task 13: Add JSON-LD structured data

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add JSON-LD Person schema inside `<head>`**

Add a `<script type="application/ld+json">` tag after the dark mode script with a Person schema containing: name, url, sameAs (GitHub, LinkedIn, Credly), jobTitle, alumniOf (UIC), and address (Chicago, IL). The content is a hardcoded JSON string literal — no user input involved.

**Step 2: Verify build and commit**

```bash
git add app/layout.tsx
git commit -m "seo: add JSON-LD Person structured data"
```

---

### Task 14: Add Credly fetch timeout and runtime validation

**Files:**
- Modify: `lib/badges.ts`

**Step 1: Add AbortController with 5s timeout, validate response shape**

Add `AbortController` with 5 second timeout. Add `Array.isArray(json?.data)` check. Filter badges with missing `id` or `badge_template.name`. Use optional chaining on `issuer.entities`.

**Step 2: Verify build and commit**

```bash
git add lib/badges.ts
git commit -m "security: add timeout and runtime validation to Credly API fetch"
```

---

### Task 15: Fix nav wordmark contrast

**Files:**
- Modify: `components/nav.tsx`

**Step 1: Raise minimum opacity from 0.35 to 0.6**

Change `0.35 + progress * 0.65` to `0.6 + progress * 0.4`. Update the initial inline style values to match.

**Step 2: Verify build and commit**

```bash
git add components/nav.tsx
git commit -m "a11y: raise nav wordmark minimum opacity to 0.6 for AA contrast"
```

---

### Task 16: Cache getBoundingClientRect in InteractiveHeadshot

**Files:**
- Modify: `components/interactive-headshot.tsx`

**Step 1: Add cachedRectRef, ResizeObserver, and passive scroll listener**

Replace the `getBoundingClientRect()` call in the hot `mousemove` path with a cached rect updated lazily via ResizeObserver and passive scroll listener.

**Step 2: Verify build and commit**

```bash
git add components/interactive-headshot.tsx
git commit -m "perf: cache getBoundingClientRect in InteractiveHeadshot via ResizeObserver"
```

---

### Task 17: Final lint check and build verification

**Step 1: Run lint**

Run: `npm run lint`
Expected: Only the 2 pre-existing lint errors. No new errors.

**Step 2: Run full build**

Run: `npm run build`
Expected: Clean build.

---

## Summary of what's fixed

| Finding | Task |
|---------|------|
| No `<main>` landmark | 1 |
| No skip link | 1 |
| Weak root description | 1 |
| No sitemap/robots | 2 |
| No CSP/HSTS/cache headers | 3 |
| Decorative diamonds not aria-hidden | 4 |
| Sections lack accessible names | 5 |
| Title template doubling | 6 |
| No canonical URLs | 6 |
| No Twitter card on gallery | 6 |
| Weak OG alt text | 6 |
| 404 no metadata | 6 |
| OG type should be profile | 6 |
| theme-transitioning overrides reduced-motion | 7 |
| localStorage.setItem unwrapped | 7 |
| Redundant body transition | 7 |
| PageTransition reduced-motion flash | 8 |
| Lightbox slides no alt | 9 |
| PhotoCard div role="button" | 9 |
| SortControls ARIA issues | 9 |
| SortControls permanent listener | 9 |
| Lightbox slideFooter O(n) find | 9 |
| Scroll indicator contrast | 9 |
| AnimatedText h1 invisible without JS | 10 |
| HeroSpeckles double-render | 11 |
| Unused Lora 500 weight | 12 |
| No JSON-LD structured data | 13 |
| Credly fetch no timeout/validation | 14 |
| Nav wordmark low contrast | 15 |
| getBoundingClientRect in hot path | 16 |
