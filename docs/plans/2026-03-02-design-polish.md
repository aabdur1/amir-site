# Design Polish Improvements

## Context

Post-code-review polish pass. 5 improvements to add personality and attention to detail before adding resume content.

---

## 1. Custom 404 Page

**File:** `app/not-found.tsx` (new)

Witty editorial tone. Large "404" in display font, *"You've wandered off the map."* in italic serif (Lora), mauve accent rule, diamond ornament, "Take me home" link styled as gallery pill. Wrapped in PageTransition. Static (no client component).

---

## 2. Scroll Progress Bar

**File:** `components/scroll-progress.tsx` (new), `app/layout.tsx`

2px mauve bar fixed to top of viewport above nav (`z-50`). Scales `scaleX(0)` → `scaleX(1)` based on scroll position. RAF-gated scroll listener, `transform-origin: left` for GPU compositing. Only renders when page is scrollable (>2x viewport height via ResizeObserver). Fades in after first scroll. Respects `prefers-reduced-motion`.

---

## 3. Photo Count-Up Animation

**File:** `components/gallery/masonry-grid.tsx`

"52 images" animates 0 → count over ~1.2s with easing. Triggers via IntersectionObserver. Uses ref for direct DOM updates (no state re-renders). Respects `prefers-reduced-motion` (shows final number immediately).

---

## 4. Smooth Dark Mode Transition

**File:** `app/globals.css`, `components/dark-mode-toggle.tsx`

Add `transition: background-color 0.3s, color 0.3s, border-color 0.3s` to key elements. Use `.theme-transitioning` class on `<html>` added on toggle, removed after 300ms — prevents transition from firing on page load. Only the manual toggle triggers the crossfade.

---

## 5. Gallery Hover Cursor

**File:** `app/globals.css` or `components/gallery/photo-card.tsx`

Custom CSS cursor for photo cards: inline SVG data URI zoom icon (16x16, mauve). Applied via `cursor: url(...) 8 8, zoom-in` on hover. Falls back to `cursor: zoom-in`.

---

## Implementation Order

1. `app/globals.css` — dark mode transition classes + gallery cursor
2. `components/dark-mode-toggle.tsx` — add/remove `.theme-transitioning`
3. `components/scroll-progress.tsx` — new component
4. `app/layout.tsx` — add ScrollProgress
5. `components/gallery/masonry-grid.tsx` — count-up animation
6. `app/not-found.tsx` — 404 page
7. `components/gallery/photo-card.tsx` — cursor class

## Commit

Single commit: all design polish together.
