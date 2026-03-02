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
- **`next/image` for optimized images.** Headshot uses `fill` + `preload`, badges use explicit `width/height`, gallery photos use `unoptimized` (direct CloudFront delivery — avoids `/_next/image` proxy overhead for ~50 large photos). Remote patterns configured in `next.config.ts` for CloudFront and Credly domains.
- **Blur-up image loading.** Gallery photo cards show a blurred placeholder and transition to the full image on load, using CSS filter transitions. Custom implementation (not `placeholder="blur"`) to avoid needing `blurDataURL` per remote image.
- **Branded OG images.** `app/opengraph-image.tsx` and `app/gallery/opengraph-image.tsx` generate 1200x630 PNGs at build time using `ImageResponse` from `next/og`. Catppuccin Mocha branding with DM Serif Display font loaded from Google Fonts gstatic. No hardcoded `images` in metadata — Next.js auto-injects from these routes.
- **Staggered page transitions.** `PageTransition` wraps each direct child with `fade-in-up` animation, 120ms stagger between sections (Hero → Certifications on home, single child on gallery).
- **Per-element parallax.** Hero elements each have their own scroll speed (label fastest, badges slowest), creating a spread/dispersal effect on scroll. Uses refs + RAF + passive scroll listener — no state re-renders.
- **Multi-accent hero badges.** Each hero badge pill has a distinct Catppuccin accent (sapphire, mauve, peach, lavender) with tinted background, colored dot, and matching hover border.
- **Cursor-reactive gradient.** `CursorGradient` tracks mouse with RAF + lerp smoothing, disabled on touch devices.
- **Cursor-reactive headshot.** `InteractiveHeadshot` tilts image toward cursor (3deg max) with dynamic shadow — cursor acts as light source. Uses perspective 3D transform + RAF + lerp. Disabled on touch devices.

## Design System — Catppuccin Editorial

**Aesthetic:** Magazine/editorial typography on Catppuccin color palette. Both modes are dark — Frappé (blue-grey) for "light" and Mocha (deep purple) for dark.

**Color tokens (light — Catppuccin Latte):** Base (`#eff1f5`), Mantle (`#e6e9ef`), Surface0 (`#ccd0da`), Text (`#4c4f69`), Subtext0 (`#6c6f85`), Overlay1 (`#8c8fa1`)

**Color tokens (dark — Catppuccin Mocha):** Base (`#1e1e2e`), Mantle (`#181825`), Surface0 (`#313244`), Text (`#cdd6f4`), Subtext0 (`#a6adc8`)

**Multi-accent system (Latte / Mocha):**
- Mauve (`#8839ef` / `#cba6f7`) — structural: rules, underlines, selection, active nav
- Peach (`#fe640b` / `#fab387`) — decorative: section numbers, ornaments, separators
- Sapphire (`#209fb5` / `#74c7ec`) — interactive: hover borders, cursor gradient
- Lavender (`#7287fd` / `#b4befe`) — ambient: headshot glow, moon icon
- Yellow (`#df8e1d` / `#f9e2af`) — kept only for dark mode toggle sun icon

**Effects:** Grain texture overlay (SVG noise at 4% opacity), sharp editorial shadows, gold text selection, gold-tinted cursor gradient.

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (gold accent rule), `shimmer` (scroll indicator), `float` (scroll line bob). Dark mode toggle: `icon-swap-in` (springy pop), `sun-spin`, `moon-rock`, `sun-glow` (gold), `moon-glow` (blue). Staggered delays throughout hero + certifications.

**Utility classes:** `btn-lift` (hover: translateY(-1px), active: snap back), `card-hover` (hover: translateY(-2px) + elevated shadow).

**CSS-based nav animations:** `.nav-wordmark::after` (gold underline sweep), `.nav-gallery-pill::before` (gold fill sweep), `.hero-line` (gradient vertical line with dark mode support). These use real CSS `transform: scaleX()` for reliable transitions.

**Bold aesthetic:** Personal portfolio with editorial energy. Hero has per-element layered parallax (elements spread apart on scroll at different rates), cursor-reactive 3D headshot, decorative offset borders, gold-tinted ambient glow. Gallery photos scale-in with rotation, hover states use gentle scale-up (1.02) + shadow bloom + slow inner image zoom (cinematic Ken Burns feel). Typography is large and confident (hero name at 5-8rem responsive). Navbar name hidden on home page while hero is visible, fades in on scroll.

## File Structure

```
app/
  layout.tsx              # Root layout, fonts (4 families), metadata, nav, footer
  opengraph-image.tsx     # Branded OG image (Catppuccin Mocha, 1200x630)
  page.tsx                # Landing: Hero + Certifications
  globals.css             # @theme tokens, keyframes, utility classes
  gallery/
    opengraph-image.tsx   # Gallery OG image (Catppuccin Mocha, 1200x630)
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
  page-transition.tsx     # Staggered fade-in-up page wrapper
  gallery/
    masonry-grid.tsx      # Masonry layout with sort + lightbox
    photo-card.tsx        # Blur-up loading + scroll reveal + hover
    sort-controls.tsx     # Styled sort dropdown
lib/
  types.ts                # Photo type definition
  badges.ts               # Credly API fetcher + manual badges, exports getAllBadges()
public/
  photos.json             # Photo metadata (CloudFront URLs, EXIF data)
  badges/                 # Non-Credly badge images (e.g. Zscaler)
netlify.toml              # Netlify build config
.nvmrc                    # Node version for Netlify
```

## Photos

- Hosted on S3 via CloudFront: `https://d36t8s1mzbufg5.cloudfront.net/`
- Metadata in `public/photos.json` (URL, date, camera, lens)
- ~50 photos currently, multi-camera (Sony, Fujifilm, Nikon) — brands derived dynamically from EXIF `camera` field in `masonry-grid.tsx`
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

- Badges fetched dynamically from Credly API at build time via `lib/badges.ts`
- `getAllBadges()` merges Credly badges + manual badges (e.g. Zscaler), sorts newest first
- Credly API: `https://www.credly.com/users/amir-abdur-rahim/badges.json` (revalidates daily)
- Manual badges defined in `lib/badges.ts` `manualBadges` array — for non-Credly certs
- Zscaler badge image stored in `public/badges/zscaler-ztca.jpeg`
- New Credly badges appear automatically on next build/revalidation
- To add a non-Credly badge: add entry to `manualBadges` in `lib/badges.ts`, put image in `public/badges/`
- Credly profile: `https://www.credly.com/users/amir-abdur-rahim`

## Implementation Plan

Full task breakdown: `docs/plans/2026-03-01-personal-site-implementation.md`
