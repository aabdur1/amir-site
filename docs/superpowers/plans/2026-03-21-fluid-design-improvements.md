# Fluid Design Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site feel more fluid and modern by adopting CSS-first animation patterns, fluid typography, smooth color transitions, a circular dark mode reveal, and the View Transitions API.

**Architecture:** Six independent improvements, each enhancing a different dimension of site fluidity. All are CSS-first with minimal JS. Changes are additive — existing functionality is preserved with progressive enhancement. Safari fallbacks are included where needed.

**Tech Stack:** CSS `clamp()`, CSS `@property`, CSS `linear()` easing, CSS `animation-timeline: scroll() / view()`, View Transitions API (React `<ViewTransition>` via Next.js 16.2), `document.startViewTransition()` for theme toggle.

---

### Task 1: Fluid Typography

Replace breakpoint-based font sizing (`text-lg sm:text-2xl md:text-3xl`) with `clamp()` custom properties. Text will scale smoothly across all viewport widths instead of jumping at breakpoints.

**Files:**
- Modify: `app/globals.css` (add `--step-*` custom properties to `@theme {}`)
- Modify: `components/hero.tsx` (replace breakpoint classes with fluid steps)
- Modify: `components/nav.tsx` (replace breakpoint classes with fluid steps)

- [ ] **Step 1: Define fluid type scale in globals.css**

Add to the `@theme {}` block after the existing font variables:

```css
/* Fluid type scale (320px → 1280px viewport) */
--step--2: clamp(0.69rem, 0.64rem + 0.25vw, 0.83rem);   /* caption / mono labels */
--step--1: clamp(0.81rem, 0.74rem + 0.33vw, 1.00rem);   /* small body */
--step-0:  clamp(1.00rem, 0.91rem + 0.43vw, 1.25rem);   /* body */
--step-1:  clamp(1.20rem, 1.07rem + 0.63vw, 1.56rem);   /* h4 / tagline */
--step-2:  clamp(1.44rem, 1.26rem + 0.89vw, 1.95rem);   /* h3 */
--step-3:  clamp(1.73rem, 1.48rem + 1.24vw, 2.44rem);   /* h2 */
--step-4:  clamp(2.49rem, 2.01rem + 2.41vw, 3.81rem);   /* h1 / hero name */
--step-5:  clamp(2.99rem, 2.35rem + 3.17vw, 4.77rem);   /* display / hero name large */
```

- [ ] **Step 2: Apply fluid scale to hero heading**

In `components/hero.tsx`, replace the name heading's breakpoint classes:

```diff
- text-5xl sm:text-6xl md:text-7xl lg:text-8xl
+ text-[length:var(--step-5)]
```

Replace the tagline's breakpoint classes:

```diff
- text-xl sm:text-2xl md:text-[1.7rem]
+ text-[length:var(--step-1)]
```

- [ ] **Step 3: Apply fluid scale to nav wordmark**

In `components/nav.tsx`, replace the wordmark's breakpoint classes:

```diff
- text-lg sm:text-2xl md:text-3xl
+ text-[length:var(--step-2)]
```

- [ ] **Step 4: Apply fluid scale to section headings**

In `components/section-header.tsx`, replace the heading's breakpoint classes. The section heading uses display font for numbered editorial sections. Find the `h2` element and replace:

```diff
- text-3xl sm:text-4xl
+ text-[length:var(--step-3)]
```

- [ ] **Step 5: Verify visually**

Open `http://localhost:3000` and slowly resize the browser window. Text should scale smoothly without jumping at breakpoints. Check:
- Hero name scales continuously from mobile to desktop
- Nav wordmark scales smoothly
- Section headings scale smoothly
- No text overflow or clipping at any width between 320px and 1920px

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/hero.tsx components/nav.tsx components/section-header.tsx
git commit -m "feat: add fluid typography with clamp() type scale"
```

---

### Task 2: CSS `@property` Accent Color Transitions

Register Catppuccin accent colors as CSS custom properties so they can animate smoothly during theme toggles and hover interactions. Without `@property`, custom property changes are instant (not interpolatable).

**Files:**
- Modify: `app/globals.css` (add `@property` declarations and transition rules)

- [ ] **Step 1: Register accent color properties**

Add BEFORE the `@theme {}` block in `globals.css`:

```css
/* Register accent colors for smooth interpolation */
@property --accent-mauve {
  syntax: "<color>";
  inherits: true;
  initial-value: #8839ef;
}
@property --accent-peach {
  syntax: "<color>";
  inherits: true;
  initial-value: #fe640b;
}
@property --accent-sapphire {
  syntax: "<color>";
  inherits: true;
  initial-value: #209fb5;
}
@property --accent-lavender {
  syntax: "<color>";
  inherits: true;
  initial-value: #7287fd;
}
```

- [ ] **Step 2: Set dark mode values and transition**

Add after the `@property` declarations:

```css
:root {
  --accent-mauve: #8839ef;
  --accent-peach: #fe640b;
  --accent-sapphire: #209fb5;
  --accent-lavender: #7287fd;
  transition: --accent-mauve 300ms ease, --accent-peach 300ms ease,
              --accent-sapphire 300ms ease, --accent-lavender 300ms ease;
}
.dark {
  --accent-mauve: #cba6f7;
  --accent-peach: #fab387;
  --accent-sapphire: #74c7ec;
  --accent-lavender: #b4befe;
}
```

- [ ] **Step 3: Verify**

Toggle dark mode. Accent colors (mauve rules, peach numbers, etc.) should now transition smoothly over 300ms instead of snapping instantly. Check the learn tab bar pills and the section header mauve rule.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: register @property accent colors for smooth theme transitions"
```

---

### Task 3: CSS `linear()` Spring Easing

Replace `cubic-bezier(0.34, 1.56, 0.64, 1)` spring easing with a more natural multi-point spring curve using the CSS `linear()` function. This provides a more physically realistic bounce.

**Files:**
- Modify: `app/globals.css` (add spring easing custom property, update utilities)

- [ ] **Step 1: Add spring easing custom property**

Add to the `@theme {}` block:

```css
/* Spring easing — natural overshoot and settle */
--ease-spring: linear(
  0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%,
  0.938 16.7%, 1.017, 1.077, 1.121 24%, 1.149 26.2%,
  1.159, 1.152 30%, 1.132, 1.089 36.2%, 1.05, 1.006 45.4%,
  0.989, 0.981 51.5%, 0.982 57.3%, 1.001 69.4%, 1.007 76.7%, 1
);
--ease-spring-settle: linear(
  0, 0.011, 0.044 2.7%, 0.17, 0.338 8.1%, 0.669 14.4%,
  0.872 18.8%, 0.974 23.1%, 1.029 27%, 1.056 30.7%,
  1.065, 1.063 37%, 1.048 40.8%, 1, 0.985 52.6%,
  0.984 57.3%, 1.001 69.2%, 1.004 76.1%, 1
);
```

- [ ] **Step 2: Update btn-lift utility**

Replace the existing `cubic-bezier` in the `.btn-lift` utility:

```diff
- transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms ease;
+ transition: transform 300ms var(--ease-spring), box-shadow 250ms ease;
```

And for the hover settle-back:

```diff
- transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 400ms ease;
+ transition: transform 400ms var(--ease-spring-settle), box-shadow 400ms ease;
```

- [ ] **Step 3: Update card-hover utility**

Apply the same spring easing to `.card-hover`:

```diff
- transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms ease;
+ transition: transform 300ms var(--ease-spring), box-shadow 250ms ease;
```

- [ ] **Step 4: Verify**

Hover over project cards and buttons on the landing page. The hover lift should feel springy and natural with a slight overshoot.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat: add CSS linear() spring easing for natural hover animations"
```

---

### Task 4: Circular Clip-Path Dark Mode Toggle

Use `document.startViewTransition()` to create a radial wipe effect emanating from the toggle button when switching themes. The new theme reveals in an expanding circle from the button position.

**Files:**
- Modify: `components/dark-mode-toggle.tsx` (use startViewTransition with clip-path)
- Modify: `app/globals.css` (add view-transition keyframes for theme toggle)

- [ ] **Step 1: Add view-transition CSS for theme toggle**

Add to `globals.css` after the existing theme transition styles:

```css
/* Circular dark mode reveal via View Transitions API */
::view-transition-old(root) {
  animation: none;
  z-index: 1;
}
::view-transition-new(root) {
  animation: circle-reveal 0.6s ease-out;
  z-index: 9999;
}
@keyframes circle-reveal {
  from {
    clip-path: circle(0% at var(--toggle-x, 50%) var(--toggle-y, 50%));
  }
  to {
    clip-path: circle(150% at var(--toggle-x, 50%) var(--toggle-y, 50%));
  }
}
/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Update toggle() to use startViewTransition**

In `components/dark-mode-toggle.tsx`, modify the `toggle` callback. The key change: instead of adding `.theme-transitioning` for a flat crossfade, use `document.startViewTransition()` to capture the old/new snapshots and animate with the circular clip-path.

Replace the toggle callback with:

```typescript
const toggle = useCallback(() => {
  const root = document.documentElement

  // Calculate toggle button position for clip-path origin
  const btn = buttonRef.current
  if (btn) {
    const rect = btn.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    root.style.setProperty('--toggle-x', `${x}px`)
    root.style.setProperty('--toggle-y', `${y}px`)
  }

  const applyTheme = () => {
    const next = root.classList.contains('dark') ? 'light' : 'dark'
    if (next === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', next) } catch {}
    setSwapKey(k => k + 1)
  }

  // Use View Transitions API if available and motion is OK
  if (document.startViewTransition && !prefersReduced) {
    document.startViewTransition(applyTheme)
  } else {
    // Fallback: flat crossfade
    root.classList.add('theme-transitioning')
    applyTheme()
    setTimeout(() => root.classList.remove('theme-transitioning'), 350)
  }
}, [prefersReduced])
```

Add a `buttonRef`:

```typescript
const buttonRef = useRef<HTMLButtonElement>(null)
```

And attach it to the `<button>`:

```diff
- <button type="button" onClick={toggle} ...>
+ <button ref={buttonRef} type="button" onClick={toggle} ...>
```

- [ ] **Step 3: Remove theme-transitioning from non-fallback path**

The `theme-transitioning` class is only needed for the non-View-Transition fallback. The View Transitions API handles the crossfade natively. Verify the existing `.theme-transitioning` CSS in globals.css is still present for the fallback path.

- [ ] **Step 4: Verify**

Toggle dark mode. In Chrome/Edge/Firefox, you should see the new theme expand in a circle from the toggle button position. In Safari (no View Transitions), you should see the existing flat crossfade fallback. Check that `prefers-reduced-motion` users get an instant toggle with no animation.

- [ ] **Step 5: Commit**

```bash
git add components/dark-mode-toggle.tsx app/globals.css
git commit -m "feat: circular clip-path reveal for dark mode toggle"
```

---

### Task 5: CSS Scroll-Driven Animations

Replace the JS-based `ScrollProgress` component and `useScrollReveal()` hook with pure CSS `animation-timeline` where supported. Falls back to existing JS implementation for Safari.

**Files:**
- Modify: `components/scroll-progress.tsx` (add CSS scroll-driven animation with JS fallback)
- Modify: `app/globals.css` (add scroll-driven animation keyframes)

- [ ] **Step 1: Add scroll-driven keyframes to globals.css**

Add to `globals.css`:

```css
/* Scroll-driven: progress bar scales with scroll position */
@keyframes scroll-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Scroll-driven: reveal elements as they enter viewport */
@keyframes scroll-reveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply scroll-driven reveal to sections (progressive enhancement) */
@supports (animation-timeline: view()) {
  .scroll-reveal-css {
    animation: scroll-reveal ease-out both;
    animation-timeline: view();
    animation-range: entry 5% entry 40%;
  }
}
```

- [ ] **Step 2: Add CSS scroll-driven progress bar**

In `components/scroll-progress.tsx`, add a CSS-driven approach that co-exists with the JS fallback. The CSS version uses `animation-timeline: scroll()` and doesn't need JS scroll listeners.

After the existing progress bar `<div>`, add a CSS-only version that's hidden when JS takes over:

Actually, the simpler approach: **enhance the existing bar element** with CSS scroll-driven animation as progressive enhancement, and skip the JS scroll listener when CSS is supported.

Add to the bar element's inline style or a class:

```css
@supports (animation-timeline: scroll()) {
  .scroll-progress-bar {
    animation: scroll-progress linear both;
    animation-timeline: scroll();
    /* Override any JS-set transform */
    transform: scaleX(var(--scroll-progress, 0)) !important;
  }
}
```

Wait — CSS `animation-timeline: scroll()` will control the `transform` automatically, making the JS mutation redundant. The cleaner approach: detect support in JS and skip the RAF listener.

In `scroll-progress.tsx`, add a check:

```typescript
// Skip JS scroll listener if CSS scroll-driven animations are supported
const cssScrollSupported = typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()')
```

If `cssScrollSupported`, add a className `scroll-progress-css` to the bar and skip attaching the scroll listener. The CSS animation handles everything.

If not supported, fall back to the existing RAF-based JS approach.

- [ ] **Step 3: Verify**

Open `http://localhost:3000` in Chrome. The scroll progress bar should track scroll position smoothly. Open Safari — it should fall back to the JS implementation. Both should look identical.

- [ ] **Step 4: Commit**

```bash
git add components/scroll-progress.tsx app/globals.css
git commit -m "feat: CSS scroll-driven progress bar with JS fallback"
```

---

### Task 6: View Transitions API for Page Navigation

Enable the View Transitions API in Next.js and wrap route content with React's `<ViewTransition>` component for smooth cross-page animations. Replace the current `PageTransition` component.

**Files:**
- Modify: `next.config.ts` (enable experimental viewTransition)
- Modify: `components/page-transition.tsx` (integrate ViewTransition with fallback)

- [ ] **Step 1: Enable View Transitions in Next.js config**

In `next.config.ts`, add the experimental flag:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    // ... existing config
  },
}
```

- [ ] **Step 2: Update PageTransition to use ViewTransition**

In `components/page-transition.tsx`, wrap children with React's `<ViewTransition>` component for supported browsers, keeping the existing staggered animation as the enter effect.

```typescript
import { ViewTransition } from 'react'
```

Wrap the return value:

```tsx
return (
  <ViewTransition>
    {/* existing staggered children logic */}
  </ViewTransition>
)
```

The `<ViewTransition>` component will automatically handle page transitions using the View Transitions API when navigating between routes. The existing `fade-in-up` stagger serves as the enter animation.

- [ ] **Step 3: Add view-transition CSS for page navigation**

Add to `globals.css`:

```css
/* Page navigation transitions */
::view-transition-old(root) {
  animation-duration: 200ms;
}
::view-transition-new(root) {
  animation-duration: 300ms;
}
```

Note: The dark mode toggle already defines `::view-transition-old(root)` and `::view-transition-new(root)`. These need to be scoped so they don't conflict. Use CSS custom properties or transition types to distinguish theme toggles from page navigations.

To avoid conflict, scope the circular reveal to theme toggles only. The dark mode toggle sets `--toggle-x` and `--toggle-y` before the transition, so check for their presence:

```css
/* Only apply circular reveal when toggle position is set (theme toggle) */
::view-transition-new(root) {
  animation: none;
}
@supports (animation-timeline: view()) {
  /* let browser handle default crossfade for navigation */
}
```

Actually, the simpler approach: use **transition types** (Next.js 16.2 feature). The theme toggle uses `startViewTransition({ update: applyTheme, types: ['theme-toggle'] })`, and page navigation uses the default type.

Update the dark mode toggle CSS:

```css
/* Circular reveal ONLY for theme toggles */
:root:active-view-transition-type(theme-toggle) {
  &::view-transition-old(root) {
    animation: none;
    z-index: 1;
  }
  &::view-transition-new(root) {
    animation: circle-reveal 0.6s ease-out;
    z-index: 9999;
  }
}
```

And update the toggle code to pass types:

```typescript
document.startViewTransition({
  update: applyTheme,
  types: ['theme-toggle'],
})
```

- [ ] **Step 4: Verify**

Navigate between pages (Home → Gallery → Learn → artifact pages). Pages should crossfade smoothly. Toggle dark mode — the circular reveal should still work and NOT conflict with page navigation transitions.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts components/page-transition.tsx app/globals.css components/dark-mode-toggle.tsx
git commit -m "feat: enable View Transitions API for smooth page navigation"
```

---

## Implementation Order

Tasks are independent and can be done in any order, but the recommended sequence is:

1. **Task 1 (Fluid Typography)** — Pure CSS, no JS changes, low risk
2. **Task 2 (@property Accents)** — Pure CSS, enhances theme toggle
3. **Task 3 (Spring Easing)** — Pure CSS, enhances hover interactions
4. **Task 4 (Circular Toggle)** — JS + CSS, standalone feature
5. **Task 5 (Scroll-Driven)** — JS + CSS, progressive enhancement
6. **Task 6 (View Transitions)** — JS + CSS + config, depends on Task 4's CSS being scoped with transition types

Task 6 should be done after Task 4, since both touch `::view-transition` CSS and the dark mode toggle. Task 6 introduces transition types that scope the circular reveal from Task 4.
