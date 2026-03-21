# Design Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add award-winning design polish — character text reveals, magnetic nav, animated grain, morphing nav indicator, gallery parallax, and gallery thumbnail optimization.

**Architecture:** Six independent features. Tasks 2 and 4 both modify nav.tsx but touch different concerns (hover interaction vs active indicator). Task 6 is a performance optimization; the rest are visual enhancements.

**Tech Stack:** CSS animations, CSS `clip-path`, RAF + lerp (existing pattern), Next.js Image optimization.

---

### Task 1: Character-by-Character Hero Text Reveal

Replace the word-level `fade-in-up` on the hero name with a character-level `clip-path` reveal. Each character slides up from behind a mask with staggered timing.

**Files:**
- Modify: `components/hero.tsx` (split name into character spans)
- Modify: `app/globals.css` (add character reveal keyframe)

**Implementation:**

The hero name is currently two `<span>` elements ("Amir" and "Abdur-Rahim") inside an `<h1>`, each with a `fade-in-up` animation. Replace each word span with a wrapper that maps characters to individual `<span>` elements.

CSS keyframe to add in `globals.css`:

```css
@keyframes char-reveal {
  from {
    transform: translateY(110%);
  }
  to {
    transform: translateY(0);
  }
}
```

In `hero.tsx`, create a helper component:

```tsx
function RevealText({ text, baseDelay }: { text: string; baseDelay: number }) {
  return (
    <span className="inline-block overflow-hidden">
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            animation: 'char-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            animationDelay: `${baseDelay + i * 0.04}s`,
            transform: 'translateY(110%)',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}
```

Replace the existing animated name spans with `<RevealText text="Amir" baseDelay={0.3} />` and `<RevealText text="Abdur-Rahim" baseDelay={0.5} />`. Remove the old `fade-in-up` animation from these elements.

The `overflow-hidden` on the wrapper clips characters below the baseline, so they appear to slide up into view. The `cubic-bezier(0.16, 1, 0.3, 1)` is a smooth deceleration curve.

Must respect `prefers-reduced-motion` — when reduced motion is preferred, skip the animation and show text immediately (set `transform: translateY(0)` with no animation).

---

### Task 2: Magnetic Nav Pills

Nav pills subtly pull toward the cursor when hovered (2-5px displacement with spring-back). Uses the same RAF + lerp pattern as `InteractiveHeadshot`.

**Files:**
- Modify: `components/nav.tsx` (add mousemove tracking on pill links)

**Implementation:**

For each nav pill (Learn, Gallery), add a `mousemove` listener that:
1. Calculates cursor position relative to pill center
2. Applies a small `translate()` toward the cursor (clamped to 4px max)
3. Uses lerp (linear interpolation) for smooth movement
4. On `mouseleave`, springs back to (0,0)

The effect should be subtle — 3-4px max displacement. Use `requestAnimationFrame` for smooth updates and direct `ref.style.transform` mutations (no React state re-renders).

Gate behind `(pointer: fine)` media query match — skip on touch devices.

Only apply to the pill container divs (the ones with the border/background), not the text inside.

Pattern from existing codebase (`interactive-headshot.tsx`):
- `mousemove` → calculate offset from center → lerp toward target
- `mouseleave` → lerp back to (0, 0)
- RAF loop with convergence check (stop when delta < 0.1px)

---

### Task 3: Animated Grain Overlay

Add a subtle animation to the existing SVG grain `body::after` overlay — a slow position shift that gives the grain a film-like quality.

**Files:**
- Modify: `app/globals.css` (add grain animation keyframe, apply to `body::after`)

**Implementation:**

Add a keyframe:

```css
@keyframes grain-drift {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2%, 1%); }
  50% { transform: translate(1%, -2%); }
  75% { transform: translate(-1%, -1%); }
}
```

Apply to the existing `body::after` rule (which has the SVG feTurbulence grain). Add:

```css
animation: grain-drift 8s steps(4) infinite;
```

Using `steps(4)` instead of smooth easing creates a subtle "film frame" effect rather than smooth floating. The 8s duration keeps it barely perceptible. The small translate percentages (1-2%) prevent visible edges.

Must respect `prefers-reduced-motion` — the existing `@media (prefers-reduced-motion: reduce)` block already kills animation durations, so this is handled automatically.

---

### Task 4: Morphing Nav Indicator

Add a pill-shaped background indicator that slides between active nav links, morphing its width and position smoothly.

**Files:**
- Modify: `components/nav.tsx` (add sliding indicator element)

**Implementation:**

Add an absolutely positioned `<div>` behind the nav pills that represents the active state. When the route changes, the indicator slides (via CSS `transition: transform, width`) to the new active pill's position.

Use `usePathname()` from `next/navigation` to determine active route. Use refs on each pill to measure their `offsetLeft` and `offsetWidth`. Position the indicator div using `transform: translateX()` and `width`.

The indicator should:
- Have `bg-mauve/10 dark:bg-mauve-dark/10` background with `border border-mauve/30 dark:border-mauve-dark/30`
- Rounded-full shape
- `transition: transform 400ms var(--ease-spring), width 400ms var(--ease-spring)` for springy movement
- Only visible on Learn and Gallery routes (hidden on homepage)
- Be behind the text via `z-index` layering

On homepage (neither Learn nor Gallery active), the indicator should have `opacity: 0` with a transition.

Note: The nav already uses `usePathname()` — reuse the existing `pathname` variable.

---

### Task 5: Gallery Image Parallax

Images in the gallery masonry grid scroll slightly slower than the page, with a subtle zoom, creating a "peek through a window" parallax effect.

**Files:**
- Modify: `components/gallery/photo-card.tsx` (add parallax scroll effect)

**Implementation:**

The effect: each image is scaled to ~1.08x inside its `overflow-hidden` container. As the card scrolls through the viewport, the image translates in the opposite direction of scroll at a reduced rate (parallax factor ~0.15), so the image appears to move slower than the page.

In `photo-card.tsx`, after the entry animation completes (`entryDone === true`):

1. Add a scroll listener (RAF-gated) that:
   - Gets the card's position relative to the viewport center
   - Calculates a parallax offset: `(cardCenterY - viewportCenterY) * -0.15`
   - Applies `transform: scale(1.08) translateY(${offset}px)` to the image ref

2. The image already has `overflow-hidden` on its container (line 69) — this clips the zoomed image so the parallax movement doesn't show edges.

3. Use IntersectionObserver to only run the scroll listener when the card is in viewport (performance).

4. Gate behind `(pointer: fine)` and `prefers-reduced-motion` — skip on touch/reduced-motion.

5. The existing hover zoom (`group-hover:scale-[1.04]`) needs adjustment — since the base scale is now 1.08, the hover scale should be `1.12` (additive).

Key: use direct `ref.style.transform` mutations (no state updates on scroll). The existing `overflow-hidden rounded-lg` container handles clipping perfectly.

---

### Task 6: Gallery Thumbnail Optimization

Remove `unoptimized` from gallery grid images so Next.js serves resized/compressed versions. Keep full-resolution for lightbox.

**Files:**
- Modify: `components/gallery/photo-card.tsx` (remove `unoptimized`, add `sizes`)
- Modify: `components/gallery/masonry-grid.tsx` (use full-res URL in lightbox slides)

**Implementation:**

In `photo-card.tsx`:
1. Remove `unoptimized` prop from the `<Image>` component
2. Add `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` for responsive loading
3. Change `width={800}` to a more reasonable thumbnail width — `width={800}` is fine, Next.js will serve appropriately sized versions based on `sizes`
4. Add `quality={80}` for good compression

In `masonry-grid.tsx`:
- The lightbox slides should continue using full-resolution URLs. Check how lightbox slides are constructed and ensure they use the raw `photo.url` (not a Next.js optimized URL). The lightbox component (`yet-another-react-lightbox`) uses `src` directly, so full-res is preserved there.

The `next.config.ts` already has CloudFront in `remotePatterns`, so Next.js Image optimization will work for these URLs.

This change means the grid loads ~800px wide optimized images (~50-100KB each) instead of full-resolution originals (~2-5MB each), dramatically improving initial load time.

---

## Implementation Order

1. **Task 3 (Animated Grain)** — Pure CSS, 5 minutes, zero risk
2. **Task 6 (Gallery Thumbnails)** — Simple prop changes, huge performance win
3. **Task 1 (Character Text Reveal)** — Hero component + CSS keyframe
4. **Task 5 (Gallery Parallax)** — Scroll effect on photo cards
5. **Task 2 (Magnetic Nav)** — JS interaction on nav pills
6. **Task 4 (Morphing Nav Indicator)** — Most complex, touches nav layout

Tasks 3 and 6 are independent quick wins. Tasks 1 and 5 are independent. Tasks 2 and 4 both modify nav.tsx so should be done sequentially.
