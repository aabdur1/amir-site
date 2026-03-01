# Personal Site Redesign — Design Document

## Overview

Complete rebuild of amirabdurrahim.com. Replace the old vibe-coded portfolio (React + Vite + shadcn/ui) with a bold, polished personal site and photography gallery. Deployed to Netlify from a new GitHub repo. Old repo (`aabdur1/amir-portfolio`) will be deleted.

## Goals

- Present Amir to potential employers as a confident builder at the intersection of healthcare and technology
- Showcase photography as a demonstration of creative ability and AWS knowledge (S3-hosted images)
- Achieve DocDefend-level design quality but bolder and more expressive — this is a personal site, not clinical software
- Mobile-first responsive design
- Clean, maintainable codebase

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 (hand-crafted components, no component libraries)
- **Deployment:** Netlify (connected to new GitHub repo)
- **Domain:** amirabdurrahim.com (existing, repoint to new deploy)
- **Photo storage:** S3 bucket `amirabdurrahim-photos.s3.us-east-2.amazonaws.com`
- **Photo data:** `photos.json` (URL, date, camera, lens metadata)

## Pages

### 1. Landing Page (`/`)

Full-viewport hero section:

- **Name:** "Amir Abdur-Rahim" in DM Serif Display, massive (6-8rem), staggered word reveal animation on load
- **Tagline:** Confident one-liner (e.g. "Healthcare meets technology. Chicago.") in lighter weight, fades in after name
- **Social links:** GitHub, LinkedIn, email — minimal icons, appear with staggered delay
- **Highlight badges:** 3-4 key credentials below the fold or after scroll cue:
  - 1st Place, AWS National Cloud Quest Competition
  - Zscaler Zero Trust Certified Architect
  - MS in MIS @ UIC (Expected Spring 2026)
  - AWS Cloud Security Builder
- **Navigation:** Link to Gallery page, minimal nav

### 2. Photography Gallery (`/gallery`)

Polished masonry grid:

- **Data source:** `photos.json` with S3 URLs
- **Layout:** Masonry grid, responsive columns (1 mobile / 2 tablet / 3-4 desktop)
- **Loading:** Blur-up placeholder effect as images load
- **Scroll behavior:** Staggered reveal — images scale from 95% to 100% with slight rotation unwind as they enter viewport
- **Hover:** Cards lift 8-12px with wider shadow spread
- **Sort controls:** Date / Camera / Lens dropdown (retained from old site)
- **Lightbox:** Click to open full-size view with EXIF metadata (camera, lens, date). Swipe on mobile.
- **Right-click disabled** on images (carried from old site)

## Visual Design System

### Color Palette — Light Mode (Primary)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#FAF6EF` | Page background |
| `bg-card` | `#F5EFE0` | Card/surface background |
| `accent` | `#1B4332` | Primary accent, links, badges |
| `accent-hover` | `#0D3321` | Hover state for accent |
| `accent-light` | `#52B788` | Secondary green, highlights |
| `text-primary` | `#1e293b` | Main body text |
| `text-muted` | `#64748b` | Secondary text |
| `border` | `#D6C9A8` | Card borders, dividers |

### Color Palette — Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0D0E12` | Page background |
| `bg-card` | `#1A1D2E` | Card/surface background |
| `accent` | `#52B788` | Primary accent (lighter for dark bg) |
| `text-primary` | `#e8ecf2` | Main body text |
| `text-muted` | `#94a3b8` | Secondary text |
| `border` | `#252A3A` | Card borders |

### Typography

| Role | Font | Fallback | Notes |
|------|------|----------|-------|
| Display/Headings | DM Serif Display | Georgia, serif | Hero name at 6-8rem, dramatic sizing |
| Body | DM Sans | system-ui, sans-serif | Clean, readable |
| Mono/Tags | Share Tech Mono | Courier, monospace | Badge labels if needed |

### Effects & Animations

**Bold personal site aesthetic (turned up from DocDefend's clinical restraint):**

- **Grain texture:** Fixed overlay, ~3.5% opacity (same as DocDefend)
- **Shadows:** Deeper, wider spread than DocDefend. Multi-layer: `0 2px 4px` + `0 8px 16px` + `0 20px 40px` at 6-10% opacity
- **Hero text reveal:** Staggered word-by-word animation, each word fades up with 100ms delay
- **Scroll animations:** Elements slide in 30-40px with fade, triggered on viewport entry
- **Gallery image entrance:** Scale 0.95 -> 1.0 with subtle rotation unwind (1-2deg)
- **Hover states:** Cards lift 8-12px, shadows expand significantly
- **Parallax:** Subtle background shift on hero section during scroll
- **Cursor reactivity:** Grain texture or subtle gradient shifts with mouse position on hero
- **Page transitions:** Smooth crossfade between landing and gallery
- **Dark mode toggle:** 300ms cubic-bezier transition on all elements

**Restraint principles (bold doesn't mean chaotic):**
- Every animation has purpose (guides attention or provides feedback)
- Warm palette stays warm — boldness comes from motion and scale, not loud colors
- Generous whitespace — photos and content breathe, never cramped

### Responsive Breakpoints

| Breakpoint | Gallery Columns | Hero Name Size | Notes |
|------------|----------------|----------------|-------|
| Mobile (<640px) | 1 column | 3-4rem | Stacked layout, touch-friendly |
| Tablet (640-1024px) | 2 columns | 5-6rem | |
| Desktop (1024px+) | 3-4 columns | 6-8rem | Full experience |

## Data

### photos.json (carried from old site)

```json
{
  "url": "https://amirabdurrahim-photos.s3.us-east-2.amazonaws.com/filename.jpg",
  "date": "2025-05-07",
  "camera": "ILCE-6700",
  "lens": "18-50mm F2.8 DC DN | Contemporary 021"
}
```

50 photos currently. All served directly from S3 public bucket.

## What Gets Deleted

- Old GitHub repo: `aabdur1/amir-portfolio`
- All AI-generated "aspiring data analyst" content
- shadcn/ui dependency
- react-helmet-async (Next.js handles meta natively)

## What Gets Retained

- `photos.json` data and S3 URLs
- Domain (amirabdurrahim.com) and Netlify deployment
- Core gallery UX (masonry + lightbox + sort)
- Social links (GitHub, LinkedIn, email)

## Future Expansion

- Projects page (planned for end of semester) — can add as a new route
- Additional certifications as they're earned — update badge section
- More photos — append to photos.json
