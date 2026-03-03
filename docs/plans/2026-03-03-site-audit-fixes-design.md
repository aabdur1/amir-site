# Site Audit Fixes — Design Document

Date: 2026-03-03

## Context

Full site audit identified 47 findings across performance, security, accessibility, and SEO. This design covers fixing all actionable findings in priority order.

## Batch Execution Plan

### Batch 1 — Layout & Structure (Critical A11y + Critical SEO)
- `layout.tsx`: Add `<main id="main-content">` wrapper, skip-to-content link, JSON-LD Person schema
- Create `app/sitemap.ts` and `app/robots.ts`

### Batch 2 — Security Headers
- `netlify.toml`: Add CSP (with hash for inline dark-mode script), HSTS, cache headers for `/badges/*` and `/_next/static/*`

### Batch 3 — Accessibility Fixes
- `section-divider.tsx` + `footer.tsx`: `aria-hidden` on decorative diamonds
- All section components: `aria-labelledby` on `<section>` elements + `id` on headings
- `sort-controls.tsx`: Fix ARIA pattern (remove `aria-activedescendant`, add `aria-controls`, close on blur)
- `photo-card.tsx`: Change `<div role="button">` to `<button>`, improve alt text
- `hero.tsx`: Fix scroll indicator contrast (raise opacity, bump to 12px)
- `animated-text.tsx`: Render visible by default, animate only after hydration

### Batch 4 — Theme & Motion
- `dark-mode-toggle.tsx`: Guard `theme-transitioning` behind `prefers-reduced-motion` check, wrap `localStorage.setItem` in try/catch
- `globals.css`: Remove redundant permanent body transition
- `page-transition.tsx`: Use `useSyncExternalStore` for reduced-motion detection (synchronous, no flash)

### Batch 5 — SEO Metadata
- `page.tsx`: Fix title with `{ absolute: '...' }`, add `alternates.canonical`, change `og:type` to `'profile'`
- `gallery/page.tsx`: Add Twitter card metadata, add `alternates.canonical`
- `not-found.tsx`: Add metadata export with `robots: { index: false }`
- OG image files: Improve `alt` exports to be descriptive
- `layout.tsx`: Improve fallback description

### Batch 6 — Performance
- `masonry-grid.tsx`: Lazy-load lightbox via `next/dynamic`, add `alt` to slides, memoize slides array + URL lookup map
- `hero-speckles.tsx`: Initialize dot count to 0, render nothing until measured
- `sort-controls.tsx`: Only attach document listener when dropdown is open, add `{ passive: true }`
- `layout.tsx`: Remove unused Lora weight 500
- `nav.tsx`: Address wordmark contrast (raise minimum opacity or switch to transform-only animation)

### Batch 7 — Stretch Fixes
- `interactive-headshot.tsx`: Cache `getBoundingClientRect` via ResizeObserver
- `badges.ts`: Add runtime validation + AbortController timeout on Credly fetch
- `dark-mode-toggle.tsx`: Extract inline dark-mode script to `/public/theme-init.js`
- `photo-card.tsx`: Improve hardcoded aspect ratio handling

## Constraints
- No new dependencies
- No component libraries (project convention)
- Maintain all existing visual behavior
- Ensure `npm run build` and `npm run lint` pass after each batch
