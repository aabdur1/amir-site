# Personal Site Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build amirabdurrahim.com from scratch as a bold, polished personal site with photography gallery using Next.js 15, Tailwind CSS 4, and TypeScript.

**Architecture:** Two-page static site (landing + gallery) using Next.js App Router. All styling via Tailwind CSS 4 with CSS-first `@theme` configuration. Photos loaded from a static JSON file pointing to S3 URLs. Dark mode via class toggle. Hand-crafted components — no component libraries.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Google Fonts (DM Serif Display, DM Sans, Share Tech Mono), yet-another-react-lightbox

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/photos.json`, `.gitignore`

**Step 1: Create Next.js project**

Run:
```bash
cd /Users/amirabdurrahim/repos/amir-site
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

When prompted about overwriting, allow it (the only existing content is docs/).

Expected: Project scaffolded with Next.js 15, Tailwind CSS 4, TypeScript.

**Step 2: Verify the scaffold runs**

Run:
```bash
cd /Users/amirabdurrahim/repos/amir-site && npm run dev
```

Expected: Dev server starts at localhost:3000. Kill after confirming.

**Step 3: Copy photos.json to public/**

Copy `/Users/amirabdurrahim/repos/src/photos.json` to `/Users/amirabdurrahim/repos/amir-site/public/photos.json`.

**Step 4: Clean up scaffold boilerplate**

Remove all default content from `app/page.tsx` (the Vercel template content). Replace with a minimal placeholder:

```tsx
export default function Home() {
  return <main>Site coming soon</main>
}
```

Remove all default styles from `app/globals.css` except the Tailwind import line.

**Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js 15 project with Tailwind CSS 4 and TypeScript"
```

---

### Task 2: Configure Design System (Colors, Typography, Effects)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Step 1: Configure fonts in layout.tsx**

Set up DM Serif Display, DM Sans, and Share Tech Mono via `next/font/google` with CSS variables:

```tsx
import { DM_Serif_Display, DM_Sans, Share_Tech_Mono } from 'next/font/google'

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

const shareTechMono = Share_Tech_Mono({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})
```

Apply all three CSS variable classes to the `<html>` element.

**Step 2: Configure Tailwind CSS 4 theme in globals.css**

Use CSS-first `@theme` configuration for all design tokens:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Colors - Light (used as defaults) */
  --color-parchment: #FAF6EF;
  --color-parchment-dark: #F5EFE0;
  --color-parchment-border: #D6C9A8;
  --color-forest: #1B4332;
  --color-forest-deep: #0D3321;
  --color-green-light: #52B788;
  --color-green-mid: #40916C;
  --color-slate: #1e293b;
  --color-slate-muted: #64748b;

  /* Colors - Dark mode */
  --color-night: #0D0E12;
  --color-night-card: #1A1D2E;
  --color-night-border: #252A3A;
  --color-night-text: #e8ecf2;
  --color-night-muted: #94a3b8;

  /* Typography */
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-mono: var(--font-mono);

  /* Shadows - bold, multi-layer */
  --shadow-card: 0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.08);
  --shadow-card-hover: 0 4px 8px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.10);

  /* Animations */
  --animate-fade-in: fade-in 0.6s ease-out forwards;
  --animate-fade-in-up: fade-in-up 0.6s ease-out forwards;
  --animate-scale-in: scale-in 0.5s ease-out forwards;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95) rotate(1.5deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}
```

**Step 3: Add grain texture overlay and base styles**

Add to globals.css after the theme block:

```css
body {
  font-family: var(--font-body), system-ui, sans-serif;
  background-color: var(--color-parchment);
  color: var(--color-slate);
  transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
              color 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dark body {
  background-color: var(--color-night);
  color: var(--color-night-text);
}

/* Grain texture overlay */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
```

**Step 4: Verify design tokens load**

Run dev server, confirm:
- Parchment background visible
- Grain texture visible (subtle noise overlay)
- No console errors about fonts

**Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "Configure design system: colors, typography, grain texture, animations"
```

---

### Task 3: Dark Mode Toggle Component

**Files:**
- Create: `components/dark-mode-toggle.tsx`
- Modify: `app/layout.tsx`

**Step 1: Build the toggle component**

Create `components/dark-mode-toggle.tsx` — a client component that:
- Reads from `localStorage` on mount (key: `theme`)
- Falls back to system preference via `prefers-color-scheme`
- Toggles `.dark` class on `<html>` element
- Renders a sun/moon icon button with smooth swap animation
- Uses `useEffect` to avoid hydration mismatch (render null until mounted)

Icon approach: simple SVG sun and moon inline (no icon library dependency).

**Step 2: Add toggle to layout**

Place the toggle in a fixed position (top-right corner) in `app/layout.tsx` so it's accessible on all pages.

**Step 3: Verify toggle works**

Run dev server. Click toggle:
- Background switches between parchment and dark
- Preference persists on page reload
- No hydration errors in console

**Step 4: Commit**

```bash
git add components/dark-mode-toggle.tsx app/layout.tsx
git commit -m "Add dark mode toggle with localStorage persistence"
```

---

### Task 4: Navigation Component

**Files:**
- Create: `components/nav.tsx`
- Modify: `app/layout.tsx`

**Step 1: Build the nav component**

Create `components/nav.tsx` — minimal navigation:
- Your name "Amir Abdur-Rahim" as a home link (left side, DM Serif Display)
- "Gallery" link (right side)
- Dark mode toggle (right side, next to Gallery)
- Sticky top, backdrop blur, subtle bottom border
- Transparent on hero, becomes solid on scroll (use scroll listener or Intersection Observer)
- Responsive: works on mobile without a hamburger menu (only 2 items)

Styles:
- Light: `bg-parchment/80 backdrop-blur-md border-b border-parchment-border`
- Dark: `bg-night/80 backdrop-blur-md border-b border-night-border`

**Step 2: Integrate nav into layout**

Move dark mode toggle inside nav. Add nav to `layout.tsx`.

**Step 3: Verify**

- Nav renders on page
- Links work (even though gallery page doesn't exist yet — should navigate to /gallery)
- Backdrop blur visible when scrolling
- Dark mode toggle still works inside nav

**Step 4: Commit**

```bash
git add components/nav.tsx app/layout.tsx
git commit -m "Add sticky navigation with backdrop blur and dark mode toggle"
```

---

### Task 5: Landing Page — Hero Section

**Files:**
- Modify: `app/page.tsx`
- Create: `components/hero.tsx`
- Create: `components/animated-text.tsx`

**Step 1: Build the animated text reveal component**

Create `components/animated-text.tsx` — a client component that:
- Takes a string and splits it into words
- Renders each word in a `<span>` with staggered animation delay (100ms per word)
- Each word fades in and slides up (uses the `fade-in-up` keyframe)
- Accepts a `className` prop for styling
- Uses `useEffect` + state to trigger animations after mount (avoids SSR flash)

**Step 2: Build the hero component**

Create `components/hero.tsx`:
- Full viewport height (`min-h-screen`) with flex centering
- Your name "Amir Abdur-Rahim" using AnimatedText, in DM Serif Display at:
  - `text-5xl sm:text-6xl md:text-7xl lg:text-8xl`
- Tagline below: "Healthcare meets technology. Chicago." in DM Sans, lighter weight, fades in after name completes (delay ~600ms)
- Social links row: GitHub, LinkedIn, Email as minimal icon links, staggered fade-in after tagline
  - GitHub: `https://github.com/aabdur1`
  - LinkedIn: `https://www.linkedin.com/in/amir-abdur-rahim/`
  - Email: `mailto:amirabdurrahim@gmail.com`
- Icons: simple inline SVGs for GitHub, LinkedIn, and Mail (no icon library)
- All centered, generous vertical spacing

**Step 3: Add hero to page.tsx**

```tsx
import { Hero } from '@/components/hero'

export default function Home() {
  return <Hero />
}
```

**Step 4: Verify**

- Name animates word-by-word on load
- Tagline fades in after name
- Social links appear with stagger
- Responsive sizing across breakpoints
- Looks correct in both light and dark mode

**Step 5: Commit**

```bash
git add app/page.tsx components/hero.tsx components/animated-text.tsx
git commit -m "Build landing page hero with staggered text reveal animation"
```

---

### Task 6: Landing Page — Credential Badges

**Files:**
- Create: `components/badges.tsx`
- Modify: `components/hero.tsx` or `app/page.tsx`

**Step 1: Build the badges component**

Create `components/badges.tsx`:
- A row/grid of 3-4 credential badges that appear below the fold (after the hero viewport)
- Scroll-triggered animation: badges fade in and slide up as they enter viewport
- Use Intersection Observer for scroll detection
- Each badge is a pill/chip shape with:
  - Background: subtle accent tint (light: `forest/10`, dark: `green-light/10`)
  - Border: `border-parchment-border` / `border-night-border`
  - Text in Share Tech Mono for a technical feel
  - Subtle hover: lift + shadow expansion

**Badges content:**
1. "1st Place — AWS National Cloud Quest"
2. "Zscaler Zero Trust Architect"
3. "MS in MIS — UIC '26"
4. "AWS Cloud Security Builder"

**Step 2: Add badges to the page**

Place badges section below the hero in `app/page.tsx`, separated by generous whitespace.

**Step 3: Verify**

- Badges not visible on initial load (below fold)
- Scrolling down triggers staggered fade-in
- Hover states work (lift + shadow)
- Responsive: wraps to 2x2 grid on mobile, single row on desktop
- Both light and dark mode

**Step 4: Commit**

```bash
git add components/badges.tsx app/page.tsx
git commit -m "Add scroll-triggered credential badges section"
```

---

### Task 7: Landing Page — Parallax & Cursor Reactivity

**Files:**
- Create: `components/cursor-gradient.tsx`
- Modify: `components/hero.tsx`

**Step 1: Build cursor-reactive gradient**

Create `components/cursor-gradient.tsx` — a client component that:
- Tracks mouse position on the hero section
- Renders a large, soft radial gradient that follows the cursor
- Color: very subtle green tint (`green-light` at 3-5% opacity)
- Uses `requestAnimationFrame` for smooth tracking
- On mobile: disabled (no mousemove events)
- On dark mode: slightly more visible (5-8% opacity)

**Step 2: Add subtle parallax to hero**

In `components/hero.tsx`:
- Add a scroll listener that applies a subtle `translateY` to the hero content as user scrolls
- Content moves up at 0.3x scroll speed (parallax factor)
- Use `transform` only (GPU-accelerated, no layout thrashing)

**Step 3: Verify**

- Moving mouse on hero shows subtle trailing gradient
- Scrolling past hero shows parallax effect
- No jank or performance issues
- Graceful on mobile (no gradient, parallax still works via scroll)

**Step 4: Commit**

```bash
git add components/cursor-gradient.tsx components/hero.tsx
git commit -m "Add cursor-reactive gradient and parallax scroll to hero"
```

---

### Task 8: Gallery Page — Data Types & Masonry Grid

**Files:**
- Create: `app/gallery/page.tsx`
- Create: `lib/types.ts`
- Create: `components/gallery/masonry-grid.tsx`

**Step 1: Define photo types**

Create `lib/types.ts`:
```typescript
export type Photo = {
  url: string
  date: string
  camera: string
  lens: string
}
```

**Step 2: Build the gallery page**

Create `app/gallery/page.tsx`:
- Import photos from `/public/photos.json` (static import at build time)
- Set page metadata (title, description, Open Graph)
- Render the gallery header ("Photography" in DM Serif Display, large) and MasonryGrid component
- Disable right-click on the page with `onContextMenu`

```tsx
import type { Metadata } from 'next'
import photos from '@/public/photos.json'
import { MasonryGrid } from '@/components/gallery/masonry-grid'

export const metadata: Metadata = {
  title: 'Photography | Amir Abdur-Rahim',
  description: 'Photography portfolio by Amir Abdur-Rahim. Landscape and street photography shot on Sony Alpha cameras.',
  openGraph: {
    title: 'Photography — Amir Abdur-Rahim',
    description: 'Photography portfolio featuring landscape and street work.',
    url: 'https://amirabdurrahim.com/gallery',
    type: 'website',
  },
}

export default function GalleryPage() {
  return <MasonryGrid photos={photos} />
}
```

**Step 3: Build the masonry grid**

Create `components/gallery/masonry-grid.tsx` — a client component:
- Accepts `photos` prop
- State: `sortBy` (date | camera | lens)
- Sorts photos based on selected sort
- CSS columns layout: `columns-1 sm:columns-2 lg:columns-3 xl:columns-4`
- Each photo rendered as a `<div>` with `break-inside-avoid`
- Images use `<img>` with `loading="lazy"`
- Generous gap between items (`gap-4 space-y-4`)
- Right-click disabled on the wrapper div

**Step 4: Verify**

- Navigate to /gallery
- Photos load from S3 and display in masonry layout
- Responsive columns work across breakpoints
- Sort dropdown changes photo order

**Step 5: Commit**

```bash
git add lib/types.ts app/gallery/page.tsx components/gallery/masonry-grid.tsx
git commit -m "Build gallery page with masonry grid and sort controls"
```

---

### Task 9: Gallery — Blur-Up Loading & Scroll Animations

**Files:**
- Create: `components/gallery/photo-card.tsx`
- Modify: `components/gallery/masonry-grid.tsx`

**Step 1: Build the photo card with blur-up loading**

Create `components/gallery/photo-card.tsx`:
- Shows a blurred, low-quality placeholder (CSS blur on a tiny version or solid color) while loading
- On image load, crossfades from blurred state to sharp image
- Implementation: render `<img>` with `filter: blur(20px)` and `scale(1.1)` initially, transition to `filter: blur(0)` and `scale(1)` on the `onLoad` event
- Transition: `transition-all duration-700 ease-out`

**Step 2: Add scroll-triggered reveal animation**

In `photo-card.tsx`:
- Use Intersection Observer to detect when card enters viewport
- Initially: `opacity-0 scale-[0.95] rotate-[1.5deg]`
- On intersect: animate to `opacity-100 scale-100 rotate-0`
- Stagger: calculate delay based on card's position in the visible batch
- Use the `scale-in` keyframe from globals.css

**Step 3: Add hover state**

On hover:
- Card lifts: `transform: translateY(-10px)`
- Shadow expands to `shadow-card-hover`
- Transition: `duration-300 ease-out`

**Step 4: Integrate photo card into masonry grid**

Replace the raw `<div>` + `<img>` in masonry-grid with the new PhotoCard component.

**Step 5: Verify**

- Photos blur in smoothly as they load
- Scrolling reveals photos with staggered scale-in animation
- Hover lifts cards with expanded shadow
- No layout shift during loading
- Smooth on mobile

**Step 6: Commit**

```bash
git add components/gallery/photo-card.tsx components/gallery/masonry-grid.tsx
git commit -m "Add blur-up loading, scroll reveal, and hover effects to gallery"
```

---

### Task 10: Gallery — Lightbox with EXIF Metadata

**Files:**
- Modify: `components/gallery/masonry-grid.tsx`

**Step 1: Install lightbox library**

Run:
```bash
npm install yet-another-react-lightbox
```

**Step 2: Integrate lightbox into masonry grid**

In `masonry-grid.tsx`:
- Add state: `lightboxOpen` (boolean), `lightboxIndex` (number)
- On photo card click: set index and open lightbox
- Render `<Lightbox>` with Zoom plugin
- Pass slides array mapped from sorted photos
- Add custom caption rendering that shows EXIF data:
  - Date, Camera model, Lens
  - Styled with DM Sans, muted text color
  - Positioned at bottom of lightbox view

**Step 3: Verify**

- Clicking a photo opens lightbox
- EXIF metadata visible in lightbox (date, camera, lens)
- Zoom works
- Swipe navigation works on mobile
- ESC / click outside closes lightbox
- No EXIF metadata visible on the grid thumbnails (clean grid)

**Step 4: Commit**

```bash
git add components/gallery/masonry-grid.tsx package.json package-lock.json
git commit -m "Add lightbox with EXIF metadata display and zoom"
```

---

### Task 11: Sort Controls for Gallery

**Files:**
- Create: `components/gallery/sort-controls.tsx`
- Modify: `components/gallery/masonry-grid.tsx`

**Step 1: Build sort controls**

Create `components/gallery/sort-controls.tsx`:
- A styled dropdown/select for sort options: Date, Camera, Lens
- Hand-crafted select styling (not native `<select>`):
  - Pill-shaped trigger button showing current sort
  - Dropdown menu with options
  - Styled to match the design system (parchment bg, forest text, border, shadow)
  - Dark mode support
- Calls `onSortChange` callback prop

**Step 2: Integrate into masonry grid**

Place sort controls in the gallery header area, right-aligned on desktop, full-width on mobile.

**Step 3: Verify**

- Sort dropdown opens and closes cleanly
- Selecting a sort option reorders photos
- Styled consistently in light and dark mode
- Accessible (keyboard navigable)

**Step 4: Commit**

```bash
git add components/gallery/sort-controls.tsx components/gallery/masonry-grid.tsx
git commit -m "Add styled sort controls to gallery"
```

---

### Task 12: Page Transitions & SEO

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `components/page-transition.tsx`

**Step 1: Add page transition wrapper**

Create `components/page-transition.tsx`:
- Wraps page content with a fade-in animation on mount
- Simple approach: CSS animation on mount (`animate-fade-in`)
- Applied to each page's root element

**Step 2: Add SEO metadata to landing page**

In `app/page.tsx`, export metadata:

```tsx
export const metadata: Metadata = {
  title: 'Amir Abdur-Rahim — Healthcare Meets Technology',
  description: 'Personal site of Amir Abdur-Rahim. MS in MIS at UIC, AWS certified, Zscaler Zero Trust Architect. Chicago.',
  openGraph: {
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
    url: 'https://amirabdurrahim.com',
    type: 'website',
    images: ['https://amirabdurrahim-photos.s3.us-east-2.amazonaws.com/_DSC4482.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
  },
}
```

**Step 3: Add root metadata in layout.tsx**

Set default metadata, viewport, and canonical URL in the root layout.

**Step 4: Verify**

- Page transitions smooth when navigating between landing and gallery
- Check page source for correct meta tags
- OG image loads correctly

**Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx components/page-transition.tsx
git commit -m "Add page transitions and SEO metadata"
```

---

### Task 13: Mobile Responsiveness Polish

**Files:**
- Modify: Various components as needed

**Step 1: Audit all components at mobile breakpoint**

Test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad):
- Hero text sizing and spacing
- Nav layout and touch targets (min 44px)
- Badge grid wrapping
- Gallery column count
- Lightbox swipe behavior
- Sort controls full-width on mobile
- Dark mode toggle tap target

**Step 2: Fix any issues found**

Common fixes:
- Padding adjustments (`px-4` on mobile, `px-8` on desktop)
- Font size scaling
- Touch target sizing (buttons min `w-11 h-11`)
- Gallery gap spacing on small screens

**Step 3: Verify**

- All pages look correct at all breakpoints
- No horizontal overflow
- Touch interactions work smoothly
- Text readable without zooming

**Step 4: Commit**

```bash
git add .
git commit -m "Polish mobile responsiveness across all breakpoints"
```

---

### Task 14: Netlify Deployment Config & CLAUDE.md

**Files:**
- Create: `netlify.toml`
- Create: `CLAUDE.md`
- Create: `.nvmrc`

**Step 1: Create netlify.toml**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Step 2: Create .nvmrc**

```
20
```

**Step 3: Create CLAUDE.md**

Write project-specific CLAUDE.md with:
- Project overview (personal site, Next.js 15 + Tailwind CSS 4)
- File structure overview
- Design system reference (link to design doc)
- Common commands (dev, build, lint)
- Key conventions (hand-crafted components, no component libraries, CSS-first Tailwind config)
- S3 photo setup details

**Step 4: Build and verify**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add netlify.toml .nvmrc CLAUDE.md
git commit -m "Add Netlify deployment config and CLAUDE.md"
```

---

### Task 15: Create GitHub Repo & Push

**Step 1: Create new GitHub repo**

Run:
```bash
cd /Users/amirabdurrahim/repos/amir-site
gh repo create amir-site --public --source=. --push
```

**Step 2: Connect Netlify to new repo**

Manual step or via Netlify CLI:
- Connect the new `amir-site` repo to the existing Netlify site for `amirabdurrahim.com`
- Or create a new Netlify site and update DNS

**Step 3: Verify deployment**

- Site builds and deploys on Netlify
- Visit amirabdurrahim.com and confirm it loads
- Test both pages, dark mode, gallery, lightbox

**Step 4: Delete old repo (after confirming new site works)**

```bash
gh repo delete aabdur1/amir-portfolio --yes
```

**Only run this after the new site is confirmed live and working.**
