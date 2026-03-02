# Focused Polish Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three design enhancements — cursor-reactive color speckles, spring-physics hover states, and richer Catppuccin accent color usage.

**Architecture:** Pure CSS + DOM approach. Speckle component follows existing RAF+convergence pattern from cursor-gradient.tsx. Spring easing is CSS-only via cubic-bezier. Color changes are small targeted swaps.

**Tech Stack:** React, Tailwind CSS 4, CSS cubic-bezier spring curves, requestAnimationFrame

---

### Task 1: Add Rosewater color tokens and spring easing to globals.css

**Files:**
- Modify: `app/globals.css:5-58` (theme tokens section)
- Modify: `app/globals.css:193-210` (utility classes section)

**Step 1: Add Rosewater tokens to @theme**

In `app/globals.css`, after line 31 (the lavender-dark token), add rosewater tokens:

```css
/* Accent: Rosewater — warm highlight (footer ornaments, social hovers) */
--color-rosewater: #dc8a78;
--color-rosewater-dark: #f5e0dc;
```

Note: `--color-gold-muted: #dc8a78` already exists at line 14 with the Rosewater value. Keep it for backward compatibility but add the properly named tokens.

**Step 2: Update btn-lift with spring easing**

Replace the `.btn-lift` utility class (lines 194-202):

```css
.btn-lift {
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.btn-lift:hover {
  transform: translateY(-1px);
  transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.btn-lift:active {
  transform: translateY(0);
}
```

**Step 3: Update card-hover with spring easing**

Replace the `.card-hover` utility class (lines 204-210):

```css
.card-hover {
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease;
}
```

**Step 4: Update nav gallery pill with spring easing**

In the `.nav-gallery-pill::before` rule (line 256), change the transition:

```css
transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Step 5: Update nav wordmark underline with spring easing**

In the `.nav-wordmark::after` rule (line 236), change the transition:

```css
transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 7: Commit**

```bash
git add app/globals.css
git commit -m "Add rosewater tokens and spring easing to utility classes"
```

---

### Task 2: Apply spring easing to hero badge pills

**Files:**
- Modify: `components/hero.tsx:276-298` (badge pills render block)

**Step 1: Add spring transition to badge pills**

In the badge `<span>` element (line 278-297), replace the `transition-all duration-300` at the end of the className with spring-physics transition via inline style.

Change the className from:
```
transition-all duration-300
```
to:
```
transition-colors duration-200
```

And in the `style` prop, add transition properties:

```tsx
style={{
  opacity: 0,
  transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 250ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms ease",
  ...(mounted
    ? {
        animation: `fade-in-up 0.5s ease-out ${1600 + i * 100}ms forwards`,
      }
    : {}),
}}
```

Also add an `onMouseEnter` and `onMouseLeave` to swap to the springy overshoot on hover entry:

Actually — simpler approach. The CSS `transition` shorthand handles this well. The spring feel comes from the cubic-bezier overshoot. We don't need mouseenter/leave handlers. Just set the spring transition in the style:

```tsx
<span
  key={badge.text}
  className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2
    ${s.bg} border ${s.border} ${s.hoverBorder}
    text-[11px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
    ${s.text}
    hover:-translate-y-0.5 hover:shadow-card
    hover:text-ink dark:hover:text-night-text`}
  style={{
    opacity: 0,
    transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease, color 200ms ease",
    ...(mounted
      ? {
          animation: `fade-in-up 0.5s ease-out ${1600 + i * 100}ms forwards`,
        }
      : {}),
  }}
>
```

**Step 2: Verify dev server**

Run: `npm run dev` and check hero badges bounce on hover.

**Step 3: Commit**

```bash
git add components/hero.tsx
git commit -m "Add spring easing to hero badge pill hovers"
```

---

### Task 3: Apply spring easing to certification cards

**Files:**
- Modify: `components/certifications.tsx:88-100` (badge card link element)

**Step 1: Replace easing on cert cards**

In the `<a>` element for each badge card (line 88-100), replace:
```
transition-all duration-300
```
with:
```
transition-colors duration-200
```

And add spring transition in the style prop:

```tsx
style={{
  opacity: 0,
  transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease",
  ...(visible
    ? {
        animation: `fade-in-up 0.5s ease-out ${200 + i * 80}ms forwards`,
      }
    : {}),
}}
```

**Step 2: Verify dev server**

Scroll to certifications section, hover cards — should have springy bounce.

**Step 3: Commit**

```bash
git add components/certifications.tsx
git commit -m "Add spring easing to certification card hovers"
```

---

### Task 4: Apply richer accent colors

**Files:**
- Modify: `components/hero.tsx:325-327` (scroll indicator text)
- Modify: `components/footer.tsx:23` (ornamental diamond)
- Modify: `components/footer.tsx:51-79` (footer link hover decoration)

**Step 1: Change scroll indicator text to lavender**

In `components/hero.tsx`, line 326, change the scroll indicator `<span>` className from:
```
text-ink-faint dark:text-night-muted/50
```
to:
```
text-lavender/50 dark:text-lavender-dark/50
```

**Step 2: Change footer ornamental diamond to rosewater**

In `components/footer.tsx`, line 23, change the diamond `<span>` className from:
```
text-peach dark:text-peach-dark
```
to:
```
text-rosewater dark:text-rosewater-dark
```

**Step 3: Change footer link hover underline to sapphire**

In `components/footer.tsx`, for each of the three links (lines 53, 66, 78), change:
```
hover:decoration-mauve dark:hover:decoration-mauve-dark
```
to:
```
hover:decoration-sapphire dark:hover:decoration-sapphire-dark
```

**Step 4: Verify dev server**

Check: scroll indicator has lavender tint, footer diamond is warm rosewater, footer link hovers show sapphire underline.

**Step 5: Commit**

```bash
git add components/hero.tsx components/footer.tsx
git commit -m "Enrich accent color usage across hero and footer"
```

---

### Task 5: Create the HeroSpeckles component

**Files:**
- Create: `components/hero-speckles.tsx`

**Step 1: Create the speckle component**

Create `components/hero-speckles.tsx` with the following implementation:

```tsx
"use client";

import { useEffect, useRef, useMemo } from "react";

interface Dot {
  x: number;        // 0-100 percentage
  y: number;        // 0-100 percentage
  size: number;     // px diameter
  baseOpacity: number;
  color: string;    // CSS color variable
  // Runtime state (mutated in RAF)
  currentX: number;
  currentY: number;
  currentOpacity: number;
}

const ACCENT_COLORS = [
  { light: "136, 57, 239",  dark: "203, 166, 247" },  // mauve
  { light: "32, 159, 181",  dark: "116, 199, 236" },  // sapphire
  { light: "254, 100, 11",  dark: "250, 179, 135" },  // peach
  { light: "114, 135, 253", dark: "180, 190, 254" },  // lavender
];

// Seeded pseudo-random for deterministic dot placement
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDots(count: number): Omit<Dot, "currentX" | "currentY" | "currentOpacity">[] {
  const rand = seededRandom(42);
  const dots: Omit<Dot, "currentX" | "currentY" | "currentOpacity">[] = [];

  for (let i = 0; i < count; i++) {
    // Bias dots toward edges: use a distribution that avoids the center
    let x = rand() * 100;
    let y = rand() * 100;

    // Push dots away from center (40-60% zone) — re-roll if too central
    const centerX = Math.abs(x - 50);
    const centerY = Math.abs(y - 50);
    if (centerX < 15 && centerY < 20 && rand() > 0.3) {
      // Push outward
      x = x < 50 ? x - 15 : x + 15;
      y = y < 50 ? y - 10 : y + 10;
      x = Math.max(2, Math.min(98, x));
      y = Math.max(2, Math.min(98, y));
    }

    dots.push({
      x,
      y,
      size: 3 + rand() * 3, // 3-6px
      baseOpacity: 0.15 + rand() * 0.15, // 0.15-0.30
      color: ACCENT_COLORS[i % ACCENT_COLORS.length].light, // placeholder, resolved at render
    });
  }

  return dots;
}

const DOT_COUNT = 35;
const INTERACTION_RADIUS = 200; // px
const MAX_DRIFT = 12; // px
const GLOW_OPACITY = 0.6;
const LERP = 0.08;

export function HeroSpeckles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const dotElsRef = useRef<HTMLDivElement[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // offscreen initially
  const activeRef = useRef(false);
  const rafRef = useRef<number>(0);

  const dotConfigs = useMemo(() => generateDots(DOT_COUNT), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only enable cursor interaction on fine pointer devices
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!hasFinePointer || prefersReducedMotion) return;

    const parent = container.parentElement;
    if (!parent) return;

    // Initialize runtime dot state
    dotsRef.current = dotConfigs.map((config) => ({
      ...config,
      currentX: 0,
      currentY: 0,
      currentOpacity: config.baseOpacity,
    }));

    // Collect dot element refs
    dotElsRef.current = Array.from(container.children) as HTMLDivElement[];

    function animate() {
      const container = containerRef.current;
      if (!container || !activeRef.current) return;

      const rect = container.getBoundingClientRect();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      let allConverged = true;

      dotsRef.current.forEach((dot, i) => {
        const el = dotElsRef.current[i];
        if (!el) return;

        // Dot center in px
        const dotCenterX = (dot.x / 100) * rect.width;
        const dotCenterY = (dot.y / 100) * rect.height;

        // Distance from cursor
        const dx = dotCenterX - mx;
        const dy = dotCenterY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Target drift and opacity based on proximity
        let targetDriftX = 0;
        let targetDriftY = 0;
        let targetOpacity = dot.baseOpacity;

        if (dist < INTERACTION_RADIUS && mx > -500) {
          const strength = 1 - dist / INTERACTION_RADIUS;
          const angle = Math.atan2(dy, dx);
          targetDriftX = Math.cos(angle) * MAX_DRIFT * strength;
          targetDriftY = Math.sin(angle) * MAX_DRIFT * strength;
          targetOpacity = dot.baseOpacity + (GLOW_OPACITY - dot.baseOpacity) * strength;
        }

        // Lerp toward targets
        dot.currentX += (targetDriftX - dot.currentX) * LERP;
        dot.currentY += (targetDriftY - dot.currentY) * LERP;
        dot.currentOpacity += (targetOpacity - dot.currentOpacity) * LERP;

        // Apply
        el.style.transform = `translate(${dot.currentX}px, ${dot.currentY}px)`;
        el.style.opacity = String(dot.currentOpacity);

        // Convergence check
        if (
          Math.abs(targetDriftX - dot.currentX) > 0.1 ||
          Math.abs(targetDriftY - dot.currentY) > 0.1 ||
          Math.abs(targetOpacity - dot.currentOpacity) > 0.005
        ) {
          allConverged = false;
        }
      });

      if (allConverged) {
        activeRef.current = false;
        rafRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;

      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      // Keep animating to let dots drift back to rest
      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dotConfigs]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {dotConfigs.map((dot, i) => {
        const colorIdx = i % ACCENT_COLORS.length;
        const light = ACCENT_COLORS[colorIdx].light;
        const dark = ACCENT_COLORS[colorIdx].dark;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
              opacity: dot.baseOpacity,
              backgroundColor: `rgb(${light})`,
              transition: "background-color 300ms ease",
            }}
          >
            {/* Dark mode color swap via CSS */}
            <style>{`
              .dark [data-speckle="${i}"] { background-color: rgb(${dark}) !important; }
            `}</style>
            <div data-speckle={i} className="hidden" />
          </div>
        );
      })}
    </div>
  );
}
```

Wait — the dark mode approach with inline `<style>` per dot is messy. Better approach: use CSS custom properties.

Revised approach — simpler:

```tsx
"use client";

import { useEffect, useRef, useMemo } from "react";

const ACCENT_COLORS = [
  "var(--color-mauve)",
  "var(--color-sapphire)",
  "var(--color-peach)",
  "var(--color-lavender)",
];

const ACCENT_COLORS_DARK = [
  "var(--color-mauve-dark)",
  "var(--color-sapphire-dark)",
  "var(--color-peach-dark)",
  "var(--color-lavender-dark)",
];

// Seeded pseudo-random for deterministic dot placement
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface DotConfig {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  colorIndex: number;
}

interface DotState {
  currentDriftX: number;
  currentDriftY: number;
  currentOpacity: number;
}

function generateDots(count: number): DotConfig[] {
  const rand = seededRandom(42);
  const dots: DotConfig[] = [];

  for (let i = 0; i < count; i++) {
    let x = rand() * 100;
    let y = rand() * 100;

    // Push dots away from center zone to avoid competing with hero text/headshot
    const centerX = Math.abs(x - 50);
    const centerY = Math.abs(y - 50);
    if (centerX < 15 && centerY < 20 && rand() > 0.3) {
      x = x < 50 ? x - 15 : x + 15;
      y = y < 50 ? y - 10 : y + 10;
      x = Math.max(2, Math.min(98, x));
      y = Math.max(2, Math.min(98, y));
    }

    dots.push({
      x,
      y,
      size: 3 + rand() * 3,
      baseOpacity: 0.15 + rand() * 0.15,
      colorIndex: i % ACCENT_COLORS.length,
    });
  }

  return dots;
}

const DOT_COUNT = 35;
const INTERACTION_RADIUS = 200;
const MAX_DRIFT = 12;
const GLOW_OPACITY = 0.6;
const LERP = 0.08;

export function HeroSpeckles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const statesRef = useRef<DotState[]>([]);
  const dotElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const activeRef = useRef(false);
  const rafRef = useRef<number>(0);
  const isDarkRef = useRef(false);

  const dotConfigs = useMemo(() => generateDots(DOT_COUNT), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasFinePointer || prefersReducedMotion) return;

    const parent = container.parentElement;
    if (!parent) return;

    // Initialize dot states
    statesRef.current = dotConfigs.map((config) => ({
      currentDriftX: 0,
      currentDriftY: 0,
      currentOpacity: config.baseOpacity,
    }));

    // Watch for dark mode changes
    const observer = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
      // Update dot colors
      dotElsRef.current.forEach((el, i) => {
        if (!el) return;
        const colors = isDarkRef.current ? ACCENT_COLORS_DARK : ACCENT_COLORS;
        el.style.backgroundColor = colors[dotConfigs[i].colorIndex];
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    isDarkRef.current = document.documentElement.classList.contains("dark");

    // Set initial colors
    dotElsRef.current.forEach((el, i) => {
      if (!el) return;
      const colors = isDarkRef.current ? ACCENT_COLORS_DARK : ACCENT_COLORS;
      el.style.backgroundColor = colors[dotConfigs[i].colorIndex];
    });

    function animate() {
      if (!activeRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      let allConverged = true;

      dotConfigs.forEach((config, i) => {
        const el = dotElsRef.current[i];
        const state = statesRef.current[i];
        if (!el || !state) return;

        const dotCenterX = (config.x / 100) * rect.width;
        const dotCenterY = (config.y / 100) * rect.height;
        const dx = dotCenterX - mx;
        const dy = dotCenterY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetDriftX = 0;
        let targetDriftY = 0;
        let targetOpacity = config.baseOpacity;

        if (dist < INTERACTION_RADIUS && mx > -500) {
          const strength = 1 - dist / INTERACTION_RADIUS;
          const angle = Math.atan2(dy, dx);
          targetDriftX = Math.cos(angle) * MAX_DRIFT * strength;
          targetDriftY = Math.sin(angle) * MAX_DRIFT * strength;
          targetOpacity = config.baseOpacity + (GLOW_OPACITY - config.baseOpacity) * strength;
        }

        state.currentDriftX += (targetDriftX - state.currentDriftX) * LERP;
        state.currentDriftY += (targetDriftY - state.currentDriftY) * LERP;
        state.currentOpacity += (targetOpacity - state.currentOpacity) * LERP;

        el.style.transform = `translate(${state.currentDriftX}px, ${state.currentDriftY}px)`;
        el.style.opacity = String(state.currentOpacity);

        if (
          Math.abs(targetDriftX - state.currentDriftX) > 0.1 ||
          Math.abs(targetDriftY - state.currentDriftY) > 0.1 ||
          Math.abs(targetOpacity - state.currentOpacity) > 0.005
        ) {
          allConverged = false;
        }
      });

      if (allConverged) {
        activeRef.current = false;
        rafRef.current = 0;
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;

      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      if (!activeRef.current) {
        activeRef.current = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      observer.disconnect();
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dotConfigs]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{
        opacity: 0,
        animation: "fade-in 1s ease-out 1s forwards",
      }}
    >
      {dotConfigs.map((dot, i) => (
        <div
          key={i}
          ref={(el) => { dotElsRef.current[i] = el; }}
          className="absolute rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            opacity: dot.baseOpacity,
            backgroundColor: ACCENT_COLORS[dot.colorIndex],
          }}
        />
      ))}
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit components/hero-speckles.tsx` or just start dev server.

**Step 3: Commit**

```bash
git add components/hero-speckles.tsx
git commit -m "Create HeroSpeckles cursor-reactive color dot component"
```

---

### Task 6: Integrate HeroSpeckles into the Hero component

**Files:**
- Modify: `components/hero.tsx:4-6` (imports)
- Modify: `components/hero.tsx:145` (after CursorGradient)

**Step 1: Add import**

In `components/hero.tsx`, after line 6 (InteractiveHeadshot import), add:

```tsx
import { HeroSpeckles } from "@/components/hero-speckles";
```

**Step 2: Add HeroSpeckles below CursorGradient**

After `<CursorGradient />` on line 145, add:

```tsx
<HeroSpeckles />
```

**Step 3: Verify dev server**

Run: `npm run dev` — hero should show colored dots that react to cursor.

**Step 4: Commit**

```bash
git add components/hero.tsx
git commit -m "Integrate HeroSpeckles into hero section"
```

---

### Task 7: Final build verification

**Files:** None (verification only)

**Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings related to our changes.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

**Step 3: Visual check list**

Start dev server (`npm run dev`) and verify:
- [ ] Hero: colored speckle dots visible, react to cursor, glow brighter near cursor
- [ ] Hero: dots drift away from cursor and settle back when cursor leaves
- [ ] Hero: badge pills have springy overshoot on hover
- [ ] Hero: scroll indicator text has lavender tint
- [ ] Nav: gallery pill background fill has spring easing
- [ ] Nav: wordmark underline has spring easing
- [ ] Certifications: cards have springy bounce on hover
- [ ] Footer: ornamental diamond is rosewater colored
- [ ] Footer: link hovers show sapphire underlines
- [ ] Dark mode: all changes look correct in both themes
- [ ] Mobile: speckle dots render static (no cursor interaction)
- [ ] Reduced motion: dots static, no spring animations playing

**Step 4: Commit all remaining changes (if any tweaks needed)**

```bash
git add -A
git commit -m "Final polish: verify focused enhancement build"
```
