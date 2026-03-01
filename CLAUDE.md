# amir-site

Personal website for Amir Abdur-Rahim at amirabdurrahim.com. Two-page static site: landing page + photography gallery.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 (CSS-first `@theme` configuration in `app/globals.css`)
- **Lightbox:** yet-another-react-lightbox (gallery EXIF overlay + zoom)
- **Deployment:** Netlify (connected to GitHub repo, `@netlify/plugin-nextjs`)
- **Domain:** amirabdurrahim.com

## Key Conventions

- **No component libraries.** All components are hand-crafted. No shadcn/ui, no Radix, no MUI.
- **CSS-first Tailwind config.** Design tokens live in `app/globals.css` via `@theme {}`, not in a JS config file.
- **Fonts via next/font/google.** DM Serif Display (headings), DM Sans (body), Share Tech Mono (mono/tags). Loaded as CSS variables in `app/layout.tsx`.
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`
- **No icon libraries.** Icons are inline SVGs.
- **Client components marked explicitly.** Components using `"use client"`: nav, dark-mode-toggle, hero, animated-text, cursor-gradient. Gallery components (masonry-grid, photo-card, sort-controls) are also client components.

## Key Patterns

- **Hydration safety via `useSyncExternalStore`.** Components that need to differ between server and client (dark-mode-toggle, hero, animated-text) use a `useHydrated()` hook built on `useSyncExternalStore(subscribe, () => true, () => false)` to safely detect client-side hydration without flicker.
- **Scroll-triggered reveals via Intersection Observer.** Gallery photo cards use `IntersectionObserver` with `threshold` and `triggerOnce` patterns to animate elements into view on scroll.
- **Blur-up image loading.** Gallery photo cards show a blurred placeholder and transition to the full image on load, using CSS opacity transitions.
- **Parallax via refs + RAF.** Hero content parallax uses `requestAnimationFrame` with passive scroll listener and visibility gating — no state re-renders.
- **Cursor-reactive gradient.** `CursorGradient` tracks mouse with RAF + lerp smoothing, disabled on touch devices.

## Design System

Full design doc: `docs/plans/2026-03-01-personal-site-redesign-design.md`

**Color tokens (light):** parchment backgrounds (`#EDE6D3`, `#E4DBBF`), parchment border (`#C4B896`), forest green accent (`#1B4332`), slate text (`#1e293b`)

**Color tokens (dark):** night backgrounds (`#0D0E12`, `#1A1D2E`), night border (`#252A3A`), light green accent (`#52B788`), light text (`#e8ecf2`)

**Effects:** Grain texture overlay (SVG noise at 7% opacity), prescription-pad horizontal lines (3% opacity), multi-layer shadows, green text selection, ambient gradient orbs.

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (accent rule), `shimmer` (scroll indicator), `float` (headshot bob), `pulse-glow` (headshot glow). Staggered delays throughout hero.

**Bold aesthetic:** This is a personal portfolio, not clinical software. Hero has asymmetric editorial layout with floating headshot, double offset decorative borders, pulsing green glow, ambient gradient orbs, growing accent line. Gallery photos scale-in with rotation, hover states lift with shadow. Typography is large and confident (hero name at 5-8rem responsive).

## File Structure

```
app/
  layout.tsx          # Root layout, fonts, metadata, nav
  page.tsx            # Landing page (hero with integrated badges)
  globals.css         # Tailwind @theme config, base styles, keyframes
  gallery/
    page.tsx          # Photography gallery page
components/
  nav.tsx             # Sticky nav with backdrop blur
  dark-mode-toggle.tsx# Class toggle with localStorage + system pref
  hero.tsx            # Asymmetric hero: animated name, headshot, badges, parallax
  animated-text.tsx   # Staggered word-by-word text reveal
  cursor-gradient.tsx # Cursor-reactive gradient on hero
  page-transition.tsx # Fade-in page wrapper
  gallery/
    masonry-grid.tsx  # Masonry layout with sort + lightbox
    photo-card.tsx    # Blur-up loading + scroll reveal + hover
    sort-controls.tsx # Styled sort dropdown
lib/
  types.ts            # Photo type definition
public/
  photos.json         # Photo metadata (CloudFront URLs, EXIF data)
netlify.toml          # Netlify build config
.nvmrc                # Node version for Netlify
```

## Photos

- Hosted on S3: `d36t8s1mzbufg5.cloudfront.net`
- Metadata in `public/photos.json` (URL, date, camera, lens)
- ~50 photos, Sony Alpha cameras (ILCE-6300, ILCE-6700)
- Right-click disabled on gallery images
- To add photos: append entries to `photos.json` with S3 URL and EXIF metadata

## Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # ESLint
```

## Implementation Plan

Full task breakdown: `docs/plans/2026-03-01-personal-site-implementation.md`
