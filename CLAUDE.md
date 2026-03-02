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
- **Fonts via next/font/google.** DM Serif Display (headings), DM Sans (body), Share Tech Mono (mono/tags), Lora (credential badges). Loaded as CSS variables (`--font-display`, `--font-body`, `--font-mono`, `--font-badge`) in `app/layout.tsx`.
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`
- **No icon libraries.** Icons are inline SVGs.
- **Client components marked explicitly.** Components using `"use client"`: nav, dark-mode-toggle, hero, animated-text, cursor-gradient, interactive-headshot, certifications, footer. Gallery components (masonry-grid, photo-card, sort-controls) are also client components.
- **No shorthand/longhand mixing in inline styles.** Always fold `animationDelay` into the `animation` shorthand to avoid React warnings.

## Key Patterns

- **Hydration safety via `useSyncExternalStore`.** Components that need to differ between server and client (dark-mode-toggle, hero, animated-text) use a `useHydrated()` hook built on `useSyncExternalStore(subscribe, () => true, () => false)` to safely detect client-side hydration without flicker.
- **Scroll-triggered reveals via Intersection Observer.** Gallery photo cards use `IntersectionObserver` with `threshold` and `triggerOnce` patterns to animate elements into view on scroll.
- **Blur-up image loading.** Gallery photo cards show a blurred placeholder and transition to the full image on load, using CSS opacity transitions.
- **Per-element parallax.** Hero elements each have their own scroll speed (label fastest, badges slowest), creating a spread/dispersal effect on scroll. Uses refs + RAF + passive scroll listener — no state re-renders.
- **Cursor-reactive gradient.** `CursorGradient` tracks mouse with RAF + lerp smoothing, disabled on touch devices.
- **Cursor-reactive headshot.** `InteractiveHeadshot` tilts image toward cursor (3deg max) with dynamic shadow — cursor acts as light source. Uses perspective 3D transform + RAF + lerp. Disabled on touch devices.

## Design System — Cool Grey Editorial

**Aesthetic:** Magazine/editorial — cool grey bg + near-black ink + gold accents. Typography does the heavy lifting.

**Color tokens (light):** cool grey bg (`#F0F1F3`, `#E5E6EA`), grey border (`#D2D3D8`), ink text (`#1a1a1a`), ink-muted (`#6b6b6b`), ink-faint (`#9a9a9a`), gold accent (`#D4A853`), gold-muted (`#C49A42`)

**Color tokens (dark):** night bg (`#0D0D0F`, `#161618`), night border (`#2a2a2e`), night text (`#e8e8e8`), night-muted (`#888888`), gold-dark (`#E8BC6A`)

**Effects:** Grain texture overlay (SVG noise at 4% opacity), sharp editorial shadows, gold text selection, gold-tinted cursor gradient.

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (gold accent rule), `shimmer` (scroll indicator), `float` (scroll line bob). Dark mode toggle: `icon-swap-in` (springy pop), `sun-spin`, `moon-rock`, `sun-glow` (gold), `moon-glow` (blue). Staggered delays throughout hero + certifications.

**Utility classes:** `btn-lift` (hover: translateY(-1px), active: snap back), `card-hover` (hover: translateY(-2px) + elevated shadow).

**CSS-based nav animations:** `.nav-wordmark::after` (gold underline sweep), `.nav-gallery-pill::before` (gold fill sweep), `.hero-line` (gradient vertical line with dark mode support). These use real CSS `transform: scaleX()` for reliable transitions.

**Bold aesthetic:** Personal portfolio with editorial energy. Hero has per-element layered parallax (elements spread apart on scroll at different rates), cursor-reactive 3D headshot, decorative offset borders, gold-tinted ambient glow. Gallery photos scale-in with rotation, hover states lift with shadow. Typography is large and confident (hero name at 5-8rem responsive). Navbar name hidden on home page while hero is visible, fades in on scroll.

## File Structure

```
app/
  layout.tsx              # Root layout, fonts (4 families), metadata, nav, footer
  page.tsx                # Landing: Hero + Certifications
  globals.css             # @theme tokens, keyframes, utility classes
  gallery/
    page.tsx              # Photography gallery page
components/
  nav.tsx                 # Sticky nav: wordmark hidden on home until scroll, gallery pill, thin rule
  footer.tsx              # Editorial footer: name, tagline, links, diamond ornaments
  dark-mode-toggle.tsx    # Animated sun/moon toggle (DocDefend-style)
  hero.tsx                # Asymmetric hero: animated name, headshot, badges, parallax
  interactive-headshot.tsx# Cursor-reactive 3D tilt headshot (light-source shadow)
  certifications.tsx      # Scroll-triggered Credly badge grid (8 certs)
  animated-text.tsx       # Staggered word-by-word text reveal
  cursor-gradient.tsx     # Cursor-reactive gradient on hero
  page-transition.tsx     # Fade-in page wrapper
  gallery/
    masonry-grid.tsx      # Masonry layout with sort + lightbox
    photo-card.tsx        # Blur-up loading + scroll reveal + hover
    sort-controls.tsx     # Styled sort dropdown
lib/
  types.ts                # Photo type definition
public/
  photos.json             # Photo metadata (CloudFront URLs, EXIF data)
netlify.toml              # Netlify build config
.nvmrc                    # Node version for Netlify
```

## Photos

- Hosted on S3 via CloudFront: `https://d36t8s1mzbufg5.cloudfront.net/`
- Metadata in `public/photos.json` (URL, date, camera, lens)
- ~50 photos, Sony Alpha cameras (ILCE-6300, ILCE-6700)
- Right-click disabled on gallery images
- To add photos: append entries to `photos.json` with S3 URL and EXIF metadata

## Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Serve production build locally
npm run lint      # ESLint
```

## Certifications

- 8 Credly badges displayed in `certifications.tsx` with hardcoded data
- Badge images hosted on `images.credly.com` (external, not on our CDN)
- To add a badge: append to the `badges` array in `certifications.tsx` with name, shortName, img URL, org, date, and Credly badge URL
- Credly profile: `https://www.credly.com/users/amir-abdur-rahim`

## Implementation Plan

Full task breakdown: `docs/plans/2026-03-01-personal-site-implementation.md`
