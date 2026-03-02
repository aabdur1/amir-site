# Focused Polish Enhancement Design

**Date:** 2026-03-02
**Approach:** Polished at rest, playful on interaction

## Overview

Three high-impact additions to the site: cursor-reactive color speckles in the hero, spring-physics hover states on interactive elements, and richer Catppuccin accent color usage throughout.

## 1. Cursor-Reactive Color Speckles

### New component: `components/hero-speckles.tsx`

- ~35 small circular dots (3-6px diameter) randomly positioned across the hero area
- Each dot assigned one of 4 Catppuccin accents: mauve, sapphire, peach, lavender
- Base state: very low opacity (0.15-0.3), subtle but visible
- **Cursor interaction**: dots within ~200px of cursor glow brighter (opacity 0.5-0.7) and drift 5-15px away from cursor. Closer dots react more strongly.
- Uses CSS transforms + opacity on DOM elements (no canvas). RAF loop with convergence check (same pattern as cursor-gradient and interactive-headshot).
- Only cursor-reactive on `(pointer: fine)` devices. On mobile/touch: dots render at base opacity as static decoration.
- Fades in with hero entrance animation (delay ~1.0s)
- Respects `prefers-reduced-motion` — renders static, no drift
- Dark/light mode: same accent colors (already designed for both palettes)
- **Positioning**: dots concentrated toward edges/corners of hero, sparser near center text to avoid visual competition with name and headshot.

## 2. Spring-Physics Hover States

### Where applied
- Hero badge pills (4 accent pills)
- Certification cards (badge grid)
- Nav gallery pill
- Nav wordmark hover underline

### Implementation
- CSS-only: replace `transition-timing-function` with springy `cubic-bezier(0.34, 1.56, 0.64, 1)` on hover entry
- Softer settle-back: `cubic-bezier(0.22, 1, 0.36, 1)` on hover exit
- Duration: 200-300ms (snappy, not floaty)
- Same curve already used in `icon-swap-in` for dark mode toggle — maintains consistency

## 3. Richer Accent Color Usage

### New accent — Rosewater
- Catppuccin Rosewater: `#dc8a78` (Latte) / `#f5e0dc` (Mocha)
- Add to `@theme` tokens in globals.css
- Use for: footer ornamental diamond, social icon hover glow

### Extended existing accents
- **Lavender** for scroll indicator text (currently subtext0 gray)
- **Peach** for gallery section number (match certifications pattern)
- **Sapphire** underline on footer link hovers (match interactive accent pattern)

### Scope
~10-15 lines of color changes across 3-4 files.

## Files to Create/Modify

- **Create:** `components/hero-speckles.tsx`
- **Modify:** `app/globals.css` (rosewater tokens, spring easing utility)
- **Modify:** `components/hero.tsx` (integrate speckles, spring on badges, lavender scroll indicator)
- **Modify:** `components/certifications.tsx` (spring on cards)
- **Modify:** `components/nav.tsx` (spring on gallery pill and wordmark)
- **Modify:** `components/footer.tsx` (rosewater diamond, sapphire link hovers)
- **Modify:** `app/gallery/page.tsx` or `components/gallery/masonry-grid.tsx` (peach section number)

## Constraints

- No new dependencies (pure CSS + DOM)
- Same RAF/convergence patterns as existing cursor components
- `prefers-reduced-motion` respected throughout
- Touch device safe — speckles degrade to static decoration
- Performance: no canvas, no heavy JS, dots are simple DOM elements with CSS transitions
