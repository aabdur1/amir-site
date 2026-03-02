# Mobile Responsiveness Fixes

## Context

Site audit revealed 7 mobile issues ranging from high to low severity. The site's major layout mechanics (grid collapse, responsive font scaling, touch device detection) are solid. These fixes address touch targets, 320px edge cases, and accessibility.

---

## 1. Footer Link Touch Targets — HIGH

**File:** `components/footer.tsx`

Footer links are plain `text-xs` with no padding — ~12px tall touch targets, far below the 44px minimum.

**Fix:** Add `py-3 px-1` to each footer link for a tappable area. This brings height to ~44px without changing visual appearance significantly.

---

## 2. `prefers-reduced-motion` Support — MEDIUM

**Files:** `app/globals.css`, `components/hero.tsx`

No reduced motion support anywhere. Users with motion sensitivity see all parallax + entrance animations.

**Fix (CSS):** Add global `@media (prefers-reduced-motion: reduce)` that kills animation durations and iteration counts.

**Fix (JS):** In hero.tsx, check `prefers-reduced-motion` before attaching scroll parallax listener — skip entirely if user prefers reduced motion.

---

## 3. Nav Name Overflow at 320px — MEDIUM

**File:** `components/nav.tsx`

"Amir Abdur-Rahim" at `text-2xl` + Gallery pill + toggle exceed 320px viewport width.

**Fix:** Scale nav name: `text-lg sm:text-2xl md:text-3xl` and add `min-w-0` to the Link so flex can shrink it.

---

## 4. Hero Badge Overflow at 320px — MEDIUM

**File:** `components/hero.tsx`

Longest badge ("1st Place — AWS National Cloud Quest") at `text-[13px]` with `px-4` is ~310px, exceeding 272px usable width on 320px screens.

**Fix:** Reduce badge text and padding on mobile: `text-[11px] sm:text-[13px]`, `px-3 sm:px-4 py-1.5 sm:py-2`, `gap-1.5 sm:gap-2`.

---

## 5. Cert Grid Cramped Below 375px — LOW-MEDIUM

**File:** `components/certifications.tsx`

2 columns at 320px = 128px per card with 96px for text after padding. Badge names wrap 3-4 lines.

**Fix:** Use `grid-cols-1 min-[375px]:grid-cols-2` instead of `grid-cols-2` so ultra-narrow devices get single column.

---

## 6. Sort Dropdown Touch Targets — LOW

**File:** `components/gallery/sort-controls.tsx`

Dropdown options have `py-2.5` = 40px total height, 4px short of 44px.

**Fix:** Change `py-2.5` to `py-3`.

---

## 7. Social Link Spacing — LOW

**File:** `components/hero.tsx`

Social icon buttons are 44x44px (good) but only `gap-1` (4px) apart. Apple HIG recommends 8px+.

**Fix:** Change `gap-1` to `gap-2`.

---

## Implementation Order

1. `app/globals.css` — reduced motion media query + tap highlight
2. `components/hero.tsx` — parallax reduced motion check + badge sizing + social gap
3. `components/footer.tsx` — link touch targets
4. `components/nav.tsx` — name text scaling + min-w-0
5. `components/certifications.tsx` — responsive grid-cols
6. `components/gallery/sort-controls.tsx` — dropdown padding

## Commit

Single commit: all mobile responsiveness fixes together.
