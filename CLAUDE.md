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
- **Dark mode via class toggle.** Uses `.dark` class on `<html>`. Custom variant defined in globals.css: `@custom-variant dark (&:where(.dark, .dark *));`. Blocking inline `<script>` in `layout.tsx` prevents flash of wrong theme on load. Toggle adds `.theme-transitioning` class for smooth 300ms crossfade.
- **No icon libraries.** Icons are inline SVGs.
- **Client components marked explicitly.** Components using `"use client"`: nav, dark-mode-toggle, hero, animated-text, hero-speckles, interactive-headshot, certifications, footer, scroll-progress, page-transition. Gallery components (masonry-grid, photo-card, sort-controls) are also client components.
- **No shorthand/longhand mixing in inline styles.** Always fold `animationDelay` into the `animation` shorthand to avoid React warnings.

## Key Patterns

- **Hydration safety via `useSyncExternalStore`.** Components that need to differ between server and client (dark-mode-toggle, hero, animated-text) use a `useHydrated()` hook built on `useSyncExternalStore(subscribe, () => true, () => false)` to safely detect client-side hydration without flicker.
- **Scroll-triggered reveals via Intersection Observer.** Gallery photo cards use `IntersectionObserver` with `threshold` and `triggerOnce` patterns to animate elements into view on scroll.
- **`next/image` for optimized images.** Headshot uses `fill` + `priority` (LCP element), badges use explicit `width/height`, gallery photos use `unoptimized` (direct CloudFront delivery — avoids `/_next/image` proxy overhead for ~50 large photos). Remote patterns configured in `next.config.ts` for CloudFront and Credly domains.
- **Blur-up image loading.** Gallery photo cards show a blurred placeholder and transition to the full image on load, using CSS filter transitions. Custom implementation (not `placeholder="blur"`) to avoid needing `blurDataURL` per remote image.
- **Branded OG images.** `app/opengraph-image.tsx` and `app/gallery/opengraph-image.tsx` generate 1200x630 PNGs at build time using `ImageResponse` from `next/og`. Catppuccin Mocha branding with DM Serif Display font loaded from Google Fonts gstatic (with try/catch fallback if font fetch fails). No hardcoded `images` in metadata — Next.js auto-injects from these routes.
- **Staggered page transitions.** `PageTransition` wraps each direct child with `fade-in-up` animation, 120ms stagger between sections. Tracks visited pages via module-level `Set` — first visit gets full stagger, return visits get a quick 200ms fade-in.
- **Per-element parallax.** Hero elements each have their own scroll speed (label fastest, badges slowest), creating a spread/dispersal effect on scroll. Uses refs + RAF + passive scroll listener — no state re-renders. Skipped entirely when `prefers-reduced-motion` is enabled.
- **Multi-accent hero badges.** Each hero badge pill has a distinct Catppuccin accent (sapphire, mauve, peach, lavender) with tinted background, colored dot, and matching hover border.
- **Cursor-reactive hero speckles (dark mode only).** `HeroSpeckles` renders 150 small dots (1-3px) across the hero using Catppuccin Mocha accents (mauve, sapphire, peach, lavender). Dots drift away from cursor (6px max) and glow brighter on approach. Hidden in light mode via `hidden dark:block`. Uses seeded PRNG for deterministic placement, RAF + lerp (0.06) + convergence check. Disabled on touch devices and with `prefers-reduced-motion`.
- **Cursor-reactive headshot.** `InteractiveHeadshot` tilts image toward cursor (3deg max) with dynamic shadow — cursor acts as light source. Uses perspective 3D transform + RAF + lerp. Disabled on touch devices.
- **RAF convergence checks.** `HeroSpeckles` and `InteractiveHeadshot` RAF loops stop automatically when lerp values converge (within 0.1px / 0.01deg), preventing infinite 60fps loops while cursor is stationary.
- **Parallax delayed start.** Hero parallax scroll listener attaches after 2.5s delay to avoid `style.transform` conflicting with CSS `fade-in-up` animation `forwards` fill during entrance animations.
- **Scroll progress bar.** `ScrollProgress` component shows a 2px mauve bar at the top of the viewport. Only renders on pages >2x viewport height (via ResizeObserver). RAF-gated scroll, fades in after first scroll.
- **Gallery count-up animation.** Photo count in gallery subtitle animates from 0 to target using RAF with cubic ease-out over 1.2s. Triggers on viewport entry via IntersectionObserver. Respects `prefers-reduced-motion`.

## Design System — Catppuccin Editorial

**Aesthetic:** Magazine/editorial typography on Catppuccin color palette. Latte (warm grey) for light mode, Mocha (deep purple) for dark.

**Color tokens (light — Catppuccin Latte):** Base (`#eff1f5`), Mantle (`#e6e9ef`), Surface0 (`#ccd0da`), Text (`#4c4f69`), Subtext0 (`#6c6f85`), Overlay1 (`#8c8fa1`)

**Color tokens (dark — Catppuccin Mocha):** Base (`#1e1e2e`), Mantle (`#181825`), Surface0 (`#313244`), Text (`#cdd6f4`), Subtext0 (`#a6adc8`)

**Multi-accent system (Latte / Mocha):**
- Mauve (`#8839ef` / `#cba6f7`) — structural: rules, underlines, selection, active nav
- Peach (`#fe640b` / `#fab387`) — decorative: section numbers, ornaments, separators
- Sapphire (`#209fb5` / `#74c7ec`) — interactive: hover borders, footer link hovers
- Lavender (`#7287fd` / `#b4befe`) — ambient: headshot glow, moon icon, scroll indicator
- Rosewater (`#dc8a78` / `#f5e0dc`) — warm highlight: footer ornamental diamond
- Yellow (`#df8e1d` / `#f9e2af`) — kept only for dark mode toggle sun icon

**Effects:** Grain texture overlay (SVG noise at 12% light / 4% dark), sharp editorial shadows, gold text selection, cursor-reactive color speckles (dark mode only).

**Animations:** `fade-in`, `fade-in-up`, `scale-in`, `dropdown-in`, `line-grow` (gold accent rule), `shimmer` (scroll indicator), `float` (scroll line bob). Dark mode toggle: `icon-swap-in` (springy pop), `sun-spin`, `moon-rock`, `sun-glow` (gold), `moon-glow` (blue). Staggered delays throughout hero + certifications.

**Utility classes:** `btn-lift` (hover: translateY(-1px) with spring overshoot, active: snap back), `card-hover` (hover: translateY(-2px) + elevated shadow with spring overshoot).

**CSS-based nav animations:** `.nav-wordmark::after` (gold underline sweep), `.nav-gallery-pill::before` (gold fill sweep), `.hero-line` (gradient vertical line with dark mode support). These use real CSS `transform: scaleX()` for reliable transitions.

**Spring easing:** Interactive elements use `cubic-bezier(0.34, 1.56, 0.64, 1)` for hover entry (slight overshoot bounce) and `cubic-bezier(0.22, 1, 0.36, 1)` for settle-back. Applied to `btn-lift`, `card-hover`, nav gallery pill fill, nav wordmark underline, hero badge pills, and certification cards.

**Bold aesthetic:** Personal portfolio with editorial energy. Hero has per-element layered parallax (elements spread apart on scroll at different rates), cursor-reactive 3D headshot, cursor-reactive color speckle field (dark mode), decorative offset borders. Gallery photos scale-in with rotation, hover states use gentle scale-up (1.02) + shadow bloom + slow inner image zoom (cinematic Ken Burns feel). Typography is large and confident (hero name at 5-8rem responsive). Navbar name hidden on home page while hero is visible, fades in on scroll.

## Mobile & Accessibility

- **320px (iPhone SE) safe.** Nav name scales `text-lg sm:text-2xl md:text-3xl` with `min-w-0`. Hero badges shrink `text-[11px] sm:text-[13px]` with `px-3 sm:px-4`. Cert grid goes single-column below 375px (`grid-cols-1 min-[375px]:grid-cols-2`).
- **Touch targets ≥ 44px.** Footer links, Credly link, and sort dropdown options all have `py-3` padding. Social icon buttons are `w-11 h-11` (44px) with `gap-2` (8px) spacing.
- **`prefers-reduced-motion` supported.** Global CSS media query kills all animation durations/iterations. Hero parallax scroll listener is skipped entirely. `PageTransition` renders without `opacity: 0` start state. Gallery count-up shows final number immediately. Cursor effects gated behind `(pointer: fine)`.
- **Gallery keyboard accessible.** Photo cards have `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), and `aria-label` with photo metadata. Sort dropdown uses `role="menu"`/`role="menuitem"`.
- **Decorative elements hidden from screen readers.** Nav arrow SVG, scroll progress bar, and hero speckles all use `aria-hidden="true"`.
- **`-webkit-tap-highlight-color: transparent`** on all `a` and `button` elements for clean mobile taps.
- **`100dvh` for hero.** Uses dynamic viewport height to account for mobile browser chrome.
- **Hero decorative line hidden on mobile.** The vertical accent line (`hero-line`) is `hidden sm:block` — only visible at 640px+ where left margin clears content.
- **`overflow-x: hidden` on body.** Prevents accidental horizontal scroll.

## File Structure

```
app/
  layout.tsx              # Root layout, fonts (4 families), metadata, nav, footer, scroll progress
  not-found.tsx           # Custom 404 page (editorial "wandered off the map")
  opengraph-image.tsx     # Branded OG image (Catppuccin Mocha, 1200x630)
  page.tsx                # Landing: Hero + Certifications
  globals.css             # @theme tokens, keyframes, utility classes, theme transitions
  gallery/
    opengraph-image.tsx   # Gallery OG image (Catppuccin Mocha, 1200x630)
    page.tsx              # Photography gallery page
components/
  nav.tsx                 # Sticky nav: wordmark hidden on home until scroll, gallery pill, thin rule
  footer.tsx              # Editorial footer: name, tagline, links, diamond ornaments
  dark-mode-toggle.tsx    # Animated sun/moon toggle with smooth theme crossfade
  hero.tsx                # Asymmetric hero: animated name, headshot, badges, parallax
  interactive-headshot.tsx# Cursor-reactive 3D tilt headshot (light-source shadow)
  certifications.tsx      # Scroll-triggered Credly badge grid (8 certs)
  animated-text.tsx       # Staggered word-by-word text reveal
  hero-speckles.tsx       # Cursor-reactive color dot field (dark mode only)
  scroll-progress.tsx     # Mauve scroll progress bar (auto-hides on short pages)
  page-transition.tsx     # Staggered fade-in-up page wrapper (reduced-motion safe)
  gallery/
    masonry-grid.tsx      # Masonry layout with sort + lightbox + count-up animation
    photo-card.tsx        # Blur-up loading + scroll reveal + hover + zoom-in cursor
    sort-controls.tsx     # Styled sort dropdown (menu/menuitem ARIA)
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
npm run lint      # ESLint (flat config via eslint.config.mjs, not next lint)
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

## Plans

- Full implementation: `docs/plans/2026-03-01-personal-site-implementation.md`
- Mobile responsiveness: `docs/plans/2026-03-01-mobile-responsiveness.md`
- Design polish: `docs/plans/2026-03-02-design-polish.md`
