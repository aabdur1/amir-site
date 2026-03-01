# amir-site

Personal website for Amir Abdur-Rahim at amirabdurrahim.com. Two-page static site: landing page + photography gallery.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 (CSS-first `@theme` configuration in `app/globals.css`)
- **Deployment:** Netlify (connected to GitHub repo)
- **Domain:** amirabdurrahim.com

## Key Conventions

- **No component libraries.** All components are hand-crafted. No shadcn/ui, no Radix, no MUI.
- **CSS-first Tailwind config.** Design tokens live in `app/globals.css` via `@theme {}`, not in a JS config file.
- **Fonts via next/font/google.** DM Serif Display (headings), DM Sans (body), Share Tech Mono (mono/tags). Loaded as CSS variables in `app/layout.tsx`.
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`
- **No icon libraries.** Icons are inline SVGs.

## Design System

Full design doc: `docs/plans/2026-03-01-personal-site-redesign-design.md`

**Color tokens (light):** parchment backgrounds (`#FAF6EF`, `#F5EFE0`), forest green accent (`#1B4332`), slate text (`#1e293b`)

**Color tokens (dark):** night backgrounds (`#0D0E12`, `#1A1D2E`), light green accent (`#52B788`), light text (`#e8ecf2`)

**Effects:** Grain texture overlay (SVG noise at 3.5% opacity), multi-layer shadows, staggered fade-in-up animations, scroll-triggered reveals via Intersection Observer.

**Bold aesthetic:** This is a personal portfolio, not clinical software. Animations are more dramatic than typical — hero text reveals word-by-word, gallery photos scale-in with rotation, hover states lift 8-12px. Typography is large and confident (hero name at 6-8rem).

## File Structure

```
app/
  layout.tsx          # Root layout, fonts, metadata, nav
  page.tsx            # Landing page (hero + badges)
  globals.css         # Tailwind @theme config, base styles, keyframes
  gallery/
    page.tsx          # Photography gallery page
components/
  nav.tsx             # Sticky nav with backdrop blur
  dark-mode-toggle.tsx
  hero.tsx            # Full-viewport hero with animated text
  animated-text.tsx   # Staggered word-by-word text reveal
  badges.tsx          # Scroll-triggered credential badges
  cursor-gradient.tsx # Cursor-reactive gradient on hero
  page-transition.tsx # Fade-in page wrapper
  gallery/
    masonry-grid.tsx  # Masonry layout with sort + lightbox
    photo-card.tsx    # Blur-up loading + scroll reveal + hover
    sort-controls.tsx # Styled sort dropdown
lib/
  types.ts            # Photo type definition
public/
  photos.json         # Photo metadata (S3 URLs, EXIF data)
```

## Photos

- Hosted on S3: `amirabdurrahim-photos.s3.us-east-2.amazonaws.com`
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
