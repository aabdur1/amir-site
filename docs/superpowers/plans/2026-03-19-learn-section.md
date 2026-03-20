# Learn Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/learn` section with 6 interactive data mining explainers converted from vanilla JS/Canvas to React, fully integrated with the Catppuccin editorial design system.

**Architecture:** Each artifact is a self-contained client component in `components/learn/`. A metadata array in `lib/learn/artifacts.ts` drives the index page, navigation, sitemap, and JSON-LD. The dynamic route `app/learn/[slug]/page.tsx` resolves slugs to components. Former tabs become scrollable sections.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Canvas 2D API, `next/og` for OG images.

**Spec:** `docs/superpowers/specs/2026-03-19-learn-section-design.md`

---

## File Map

### New files to create

| File | Responsibility |
|------|---------------|
| `lib/learn/artifacts.ts` | Metadata array: slug, title, description, order, subtopics, component mapping |
| `app/learn/page.tsx` | Index page (server component): metadata, card grid |
| `app/learn/opengraph-image.tsx` | OG image for `/learn` |
| `app/learn/[slug]/page.tsx` | Dynamic route (server component): resolves slug, renders artifact, back link, prev/next |
| `app/learn/[slug]/opengraph-image.tsx` | OG image for artifact pages (re-exports learn OG) |
| `components/learn/learn-card.tsx` | Client component: card with illustration, number, title, tags, scroll reveal |
| `components/learn/learn-nav.tsx` | Server component: prev/next links between artifacts |
| `components/learn/gradient-descent.tsx` | Client component: Gradient Descent artifact (4 sections) |
| `components/learn/log-loss-cross-entropy.tsx` | Client component: Log Loss & Cross-Entropy artifact (4 sections) |
| `components/learn/pca.tsx` | Client component: PCA artifact (5 sections) |
| `components/learn/regularization.tsx` | Client component: Regularization artifact (2 sections) |
| `components/learn/clustering.tsx` | Client component: Clustering artifact (3 sections) |
| `components/learn/shap.tsx` | Client component: SHAP artifact (4 sections) |

### Existing files to modify

| File | Change |
|------|--------|
| `components/nav.tsx` | Add "Learn" pill link with `isLearn` pathname check |
| `app/globals.css` | Add `.nav-learn-pill` CSS classes (mauve fill sweep) |
| `app/sitemap.ts` | Import artifacts metadata, append `/learn` + `/learn/[slug]` entries |
| `CLAUDE.md` | Update file structure, key patterns, and component lists |

---

## Task 1: Artifact Metadata (`lib/learn/artifacts.ts`)

**Files:**
- Create: `lib/learn/artifacts.ts`

This is the foundation — everything else depends on this array.

- [ ] **Step 1: Create the metadata file**

```typescript
// lib/learn/artifacts.ts

export interface Artifact {
  slug: string
  title: string
  shortTitle: string
  description: string
  number: string
  subtopics: string[]
  sectionCount: number
}

export const ARTIFACTS: Artifact[] = [
  {
    slug: 'gradient-descent',
    title: 'Gradient Descent',
    shortTitle: 'Gradient Descent',
    description: 'How optimization algorithms find the minimum of a loss function through iterative steps.',
    number: '01',
    subtopics: ['Loss curves', 'Learning rate', 'Batch variants', 'Gradient boosting connection'],
    sectionCount: 4,
  },
  {
    slug: 'log-loss-cross-entropy',
    title: 'Log Loss & Cross-Entropy',
    shortTitle: 'Log Loss',
    description: 'Loss functions for classification — from normality testing to the unified connection between MLE, log loss, and cross-entropy.',
    number: '02',
    subtopics: ['QQ plots', 'Log loss', 'Entropy & Gini', 'Unified connection'],
    sectionCount: 4,
  },
  {
    slug: 'pca',
    title: 'PCA / Dimensionality Reduction',
    shortTitle: 'PCA',
    description: 'How principal component analysis compresses high-dimensional data by finding directions of maximum variance.',
    number: '03',
    subtopics: ['Covariance & eigenvectors', 'Scree plots', 'Standardization', 'PC scores', 'Misconceptions'],
    sectionCount: 5,
  },
  {
    slug: 'regularization',
    title: 'Regularization / Bias-Variance',
    shortTitle: 'Regularization',
    description: 'How Ridge and Lasso penalties control model complexity by trading bias for variance.',
    number: '04',
    subtopics: ['Ridge (L2)', 'Lasso (L1)', 'Lambda tuning', 'Bias-variance tradeoff'],
    sectionCount: 2,
  },
  {
    slug: 'clustering',
    title: 'Clustering',
    shortTitle: 'Clustering',
    description: 'Three fundamental clustering algorithms and how they handle different data shapes.',
    number: '05',
    subtopics: ['K-means', 'Hierarchical', 'DBSCAN'],
    sectionCount: 3,
  },
  {
    slug: 'shap',
    title: 'SHAP / Interpretability',
    shortTitle: 'SHAP',
    description: 'How SHAP values explain individual predictions by fairly distributing credit across features.',
    number: '06',
    subtopics: ['Waterfall charts', 'Beeswarm plots', 'Global importance', 'Shapley math'],
    sectionCount: 4,
  },
]

export function getArtifact(slug: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.slug === slug)
}

export function getAdjacentArtifacts(slug: string): { prev: Artifact | null; next: Artifact | null } {
  const index = ARTIFACTS.findIndex((a) => a.slug === slug)
  return {
    prev: index > 0 ? ARTIFACTS[index - 1] : null,
    next: index < ARTIFACTS.length - 1 ? ARTIFACTS[index + 1] : null,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (project-wide check, respects tsconfig path aliases)

- [ ] **Step 3: Commit**

```bash
git add lib/learn/artifacts.ts
git commit -m "feat(learn): add artifact metadata array"
```

---

## Task 2: Nav Integration

**Files:**
- Modify: `components/nav.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add Learn pill CSS to globals.css**

Add after the `.nav-gallery-pill.nav-gallery-active::before` block (after line 274 in `globals.css`):

```css
/* Nav learn pill — mauve background fill sweep on hover */
.nav-learn-pill::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: rgba(136, 57, 239, 0.08);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dark .nav-learn-pill::before {
  background: rgba(203, 166, 247, 0.1);
}

.nav-learn-pill:hover::before {
  transform: scaleX(1);
}

.nav-learn-pill.nav-learn-active::before {
  transform: scaleX(1);
}
```

- [ ] **Step 2: Add Learn link to nav component**

In `components/nav.tsx`, add `isLearn` check and the Learn pill link. Add after `const isGallery`:

```typescript
const isLearn = pathname.startsWith("/learn");
```

Add the Learn pill link before the Gallery pill link in the nav items div (before the `<Link href="/gallery"` block):

```tsx
<Link
  href="/learn"
  className={`nav-learn-pill group relative font-[family-name:var(--font-mono)] text-[13px]
    tracking-[0.15em] uppercase
    px-4 py-2 rounded-full border overflow-hidden
    transition-all duration-300
    ${isLearn
      ? "nav-learn-active border-mauve dark:border-mauve-dark text-ink dark:text-night-text"
      : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/60 dark:hover:border-mauve-dark/60 hover:text-ink dark:hover:text-night-text"
    }`}
>
  <span className={`relative z-10 flex items-center transition-all duration-300 ${
    isLearn ? 'gap-1.5' : 'gap-0 group-hover:gap-1.5'
  }`}>
    Learn
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3 overflow-hidden transition-all duration-300 ${
        isLearn ? 'w-3 opacity-100' : 'w-0 opacity-0 group-hover:w-3 group-hover:opacity-100'
      }`}
    >
      <path d="M2 6h8M7 3l3 3-3 3" />
    </svg>
  </span>
</Link>
```

- [ ] **Step 3: Verify dev server renders correctly**

Run: `npm run dev`
Check: Navigate to `http://localhost:3000`, verify "Learn" pill appears in nav before "Gallery", hover effects work, active state activates on `/learn` paths.

- [ ] **Step 4: Commit**

```bash
git add components/nav.tsx app/globals.css
git commit -m "feat(learn): add Learn nav pill with mauve accent"
```

---

## Task 3: Learn Card Component

**Files:**
- Create: `components/learn/learn-card.tsx`

- [ ] **Step 1: Create the learn card component**

This is the card used on the index page. Each card has an SVG illustration area, numbered label, title, description, and accent pills.

```tsx
// components/learn/learn-card.tsx
"use client"

import Link from "next/link"
import { useScrollReveal } from "@/lib/hooks"
import { ACCENT_STYLES } from "@/lib/styles"
import type { Artifact } from "@/lib/learn/artifacts"
import type { AccentColor } from "@/lib/styles"

const CARD_ACCENTS: AccentColor[] = ['sapphire', 'mauve', 'peach', 'lavender']

interface LearnCardProps {
  artifact: Artifact
  index: number
  illustration: React.ReactNode
}

export function LearnCard({ artifact, index, illustration }: LearnCardProps) {
  const [ref, visible] = useScrollReveal()
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const styles = ACCENT_STYLES[accent]

  return (
    <div
      ref={ref}
      style={visible ? {
        animation: `fade-in-up 0.6s ease-out ${index * 0.12}s forwards`,
        opacity: 0,
      } : { opacity: 0 }}
    >
      <Link
        href={`/learn/${artifact.slug}`}
        className="card-hover group block rounded-xl border border-cream-border dark:border-night-border
          bg-white dark:bg-night-card overflow-hidden transition-all duration-300"
      >
        {/* SVG illustration area */}
        <div className="flex items-center justify-center h-40 bg-cream-dark/50 dark:bg-night/60
          border-b border-cream-border dark:border-night-border">
          {illustration}
        </div>

        {/* Card content */}
        <div className="p-5">
          {/* Number + title */}
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-peach dark:text-peach-dark">
              {artifact.number}/
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-lg text-ink dark:text-night-text">
              {artifact.title}
            </h3>
          </div>

          {/* Subtopics */}
          <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-3">
            {artifact.subtopics.join(' · ')}
          </p>

          {/* Pills */}
          <div className="flex gap-2 flex-wrap">
            <span className={`${styles.bg} ${styles.border} border text-[12px] px-2.5 py-0.5 rounded-full
              font-[family-name:var(--font-mono)] ${styles.text}`}>
              {artifact.sectionCount} sections
            </span>
            <span className={`${styles.bg} ${styles.border} border text-[12px] px-2.5 py-0.5 rounded-full
              font-[family-name:var(--font-mono)] ${styles.text}`}>
              Interactive
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/learn/learn-card.tsx
git commit -m "feat(learn): add learn card component for index grid"
```

---

## Task 4: Learn Nav Component (Prev/Next)

**Files:**
- Create: `components/learn/learn-nav.tsx`

- [ ] **Step 1: Create the prev/next nav component**

```tsx
// components/learn/learn-nav.tsx
import Link from "next/link"
import type { Artifact } from "@/lib/learn/artifacts"

interface LearnNavProps {
  prev: Artifact | null
  next: Artifact | null
}

export function LearnNav({ prev, next }: LearnNavProps) {
  return (
    <nav aria-label="Artifact navigation" className="flex items-center justify-between border-t border-cream-border dark:border-night-border pt-8 mt-16">
      {prev ? (
        <Link
          href={`/learn/${prev.slug}`}
          className="group flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M10 6H2M5 9L2 6l3-3" />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase">
            {prev.shortTitle}
          </span>
        </Link>
      ) : <div />}

      {next ? (
        <Link
          href={`/learn/${next.slug}`}
          className="group flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors"
        >
          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase">
            {next.shortTitle}
          </span>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          >
            <path d="M2 6h8M7 3l3 3-3 3" />
          </svg>
        </Link>
      ) : <div />}
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/learn/learn-nav.tsx
git commit -m "feat(learn): add prev/next navigation component"
```

---

## Task 5: Index Page (`/learn`)

**Files:**
- Create: `app/learn/page.tsx`

- [ ] **Step 1: Create the index page**

```tsx
// app/learn/page.tsx
import type { Metadata } from 'next'
import { ARTIFACTS } from '@/lib/learn/artifacts'
import { LearnCard } from '@/components/learn/learn-card'
import { PageTransition } from '@/components/page-transition'
import { SectionDivider } from '@/components/section-divider'

export const metadata: Metadata = {
  title: 'Learn — Interactive Data Mining Explainers',
  description:
    'Interactive visual explainers for data mining concepts. Built while studying IDS 572 — gradient descent, PCA, clustering, regularization, SHAP, and more.',
  alternates: {
    canonical: 'https://amirabdurrahim.com/learn',
  },
  openGraph: {
    title: 'Learn — Interactive Data Mining Explainers',
    description:
      'Interactive visual explainers for data mining concepts like gradient descent, PCA, clustering, and SHAP.',
    url: 'https://amirabdurrahim.com/learn',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn — Interactive Data Mining Explainers',
    description: 'Interactive visual explainers for data mining concepts.',
  },
}

// SVG illustrations for each artifact card — concept-specific mini graphics
function GradientDescentIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <path d="M8 56 Q20 12 40 30 Q60 48 72 8" stroke="currentColor" className="text-mauve dark:text-mauve-dark" fill="none" strokeWidth="2.5" />
      <circle cx="40" cy="30" r="4" className="fill-peach dark:fill-peach-dark" />
      <line x1="40" y1="30" x2="40" y2="16" className="stroke-peach dark:stroke-peach-dark" strokeWidth="1.5" strokeDasharray="3" />
    </svg>
  )
}

function LogLossIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <path d="M10 8 Q10 56 40 56" stroke="currentColor" className="text-sapphire dark:text-sapphire-dark" fill="none" strokeWidth="2.5" />
      <path d="M70 8 Q70 56 40 56" stroke="currentColor" className="text-peach dark:text-peach-dark" fill="none" strokeWidth="2.5" strokeDasharray="4" />
      <line x1="10" y1="56" x2="70" y2="56" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
    </svg>
  )
}

function PCAIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="10" y="38" width="10" height="18" rx="2" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.8" />
      <rect x="24" y="18" width="10" height="38" rx="2" className="fill-mauve dark:fill-mauve-dark" opacity="0.8" />
      <rect x="38" y="28" width="10" height="28" rx="2" className="fill-peach dark:fill-peach-dark" opacity="0.8" />
      <rect x="52" y="10" width="10" height="46" rx="2" className="fill-lavender dark:fill-lavender-dark" opacity="0.8" />
      <line x1="8" y1="56" x2="68" y2="56" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
    </svg>
  )
}

function RegularizationIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="12" y="8" width="6" height="48" rx="3" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.25" />
      <rect x="12" y="22" width="6" height="34" rx="3" className="fill-sapphire dark:fill-sapphire-dark" />
      <rect x="26" y="8" width="6" height="48" rx="3" className="fill-mauve dark:fill-mauve-dark" opacity="0.25" />
      <rect x="26" y="30" width="6" height="26" rx="3" className="fill-mauve dark:fill-mauve-dark" />
      <rect x="40" y="8" width="6" height="48" rx="3" className="fill-peach dark:fill-peach-dark" opacity="0.25" />
      <rect x="40" y="42" width="6" height="14" rx="3" className="fill-peach dark:fill-peach-dark" />
      <rect x="54" y="8" width="6" height="48" rx="3" className="fill-lavender dark:fill-lavender-dark" opacity="0.25" />
      <rect x="54" y="50" width="6" height="6" rx="3" className="fill-lavender dark:fill-lavender-dark" />
    </svg>
  )
}

function ClusteringIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <circle cx="22" cy="20" r="8" fill="none" className="stroke-sapphire dark:stroke-sapphire-dark" strokeWidth="1.5" />
      <circle cx="22" cy="20" r="2.5" className="fill-sapphire dark:fill-sapphire-dark" />
      <circle cx="56" cy="38" r="8" fill="none" className="stroke-peach dark:stroke-peach-dark" strokeWidth="1.5" />
      <circle cx="56" cy="38" r="2.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="40" cy="50" r="6" fill="none" className="stroke-mauve dark:stroke-mauve-dark" strokeWidth="1.5" />
      <circle cx="40" cy="50" r="2" className="fill-mauve dark:fill-mauve-dark" />
    </svg>
  )
}

function SHAPIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {/* Waterfall bars */}
      <rect x="12" y="12" width="22" height="8" rx="1" className="fill-sapphire dark:fill-sapphire-dark" />
      <rect x="38" y="12" width="14" height="8" rx="1" className="fill-peach dark:fill-peach-dark" opacity="0.7" />
      <rect x="12" y="26" width="30" height="8" rx="1" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.6" />
      <rect x="12" y="40" width="18" height="8" rx="1" className="fill-peach dark:fill-peach-dark" />
      <rect x="12" y="54" width="40" height="4" rx="1" className="fill-mauve dark:fill-mauve-dark" />
    </svg>
  )
}

const ILLUSTRATIONS: Record<string, () => React.JSX.Element> = {
  'gradient-descent': GradientDescentIllustration,
  'log-loss-cross-entropy': LogLossIllustration,
  'pca': PCAIllustration,
  'regularization': RegularizationIllustration,
  'clustering': ClusteringIllustration,
  'shap': SHAPIllustration,
}

export default function LearnPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 pt-20 pb-24">
        {/* Ornamental divider */}
        <SectionDivider color="peach" absolute={false} />

        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase text-mauve dark:text-mauve-dark mb-4">
            Interactive Explainers
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-ink dark:text-night-text mb-4">
            Data Mining Concepts
          </h1>
          <p className="text-ink-subtle dark:text-night-muted text-[15px] max-w-xl mx-auto mb-6">
            Built while studying IDS 572 — interactive tools for understanding machine learning fundamentals
          </p>
          <div className="h-px w-12 bg-mauve dark:bg-mauve-dark mx-auto"
            style={{ animation: 'line-grow 0.8s ease-out 0.3s forwards', transform: 'scaleX(0)', transformOrigin: 'center' }} />
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {ARTIFACTS.map((artifact, i) => {
            const Illustration = ILLUSTRATIONS[artifact.slug]
            return (
              <LearnCard
                key={artifact.slug}
                artifact={artifact}
                index={i}
                illustration={Illustration ? <Illustration /> : null}
              />
            )
          })}
        </div>
      </section>
    </PageTransition>
  )
}
```

- [ ] **Step 2: Verify page renders in dev**

Run: `npm run dev`
Check: Navigate to `http://localhost:3000/learn`, verify header, card grid renders with illustrations, scroll reveal animations, card hover effects, links work (will 404 until artifact pages exist).

- [ ] **Step 3: Commit**

```bash
git add app/learn/page.tsx
git commit -m "feat(learn): add index page with card grid"
```

---

## Task 6: OG Images

**Files:**
- Create: `app/learn/opengraph-image.tsx`
- Create: `app/learn/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Create learn OG image**

Follow the exact pattern from `app/opengraph-image.tsx`:

```tsx
// app/learn/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Data Mining Concepts — Interactive Explainers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf'
    )
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const fontData = await loadFont()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e1e2e',
          fontFamily: 'DM Serif',
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 16,
            color: '#cba6f7',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            marginBottom: 24,
          }}
        >
          Interactive Explainers
        </div>

        {/* Mauve accent line */}
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: '#cba6f7',
            marginBottom: 32,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            color: '#cdd6f4',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          Data Mining Concepts
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: '#a6adc8',
            marginTop: 20,
            fontFamily: 'sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          Amir Abdur-Rahim
        </div>

        {/* Diamond ornament */}
        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            color: '#fab387',
          }}
        >
          ◆
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'DM Serif', data: fontData, style: 'normal' as const, weight: 400 as const }]
        : [],
    }
  )
}
```

- [ ] **Step 2: Create artifact page OG image (re-export)**

```tsx
// app/learn/[slug]/opengraph-image.tsx
export { default, alt, size, contentType } from '../opengraph-image'
```

- [ ] **Step 3: Commit**

```bash
git add app/learn/opengraph-image.tsx app/learn/\[slug\]/opengraph-image.tsx
git commit -m "feat(learn): add OG images for learn and artifact pages"
```

---

## Task 7: Dynamic Route Page (`/learn/[slug]`)

**Files:**
- Create: `app/learn/[slug]/page.tsx`

This is the server component that resolves a slug to an artifact and renders the appropriate client component with back link and prev/next nav.

- [ ] **Step 1: Create the dynamic route page**

```tsx
// app/learn/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ARTIFACTS, getArtifact, getAdjacentArtifacts } from '@/lib/learn/artifacts'
import { LearnNav } from '@/components/learn/learn-nav'
import { PageTransition } from '@/components/page-transition'
import Link from 'next/link'

import dynamic from 'next/dynamic'

// Lazy-loaded artifact components — uncomment as each is built
// const GradientDescent = dynamic(() => import('@/components/learn/gradient-descent').then(m => ({ default: m.GradientDescent })))
// const LogLossCrossEntropy = dynamic(() => import('@/components/learn/log-loss-cross-entropy').then(m => ({ default: m.LogLossCrossEntropy })))
// const PCA = dynamic(() => import('@/components/learn/pca').then(m => ({ default: m.PCA })))
// const Regularization = dynamic(() => import('@/components/learn/regularization').then(m => ({ default: m.Regularization })))
// const Clustering = dynamic(() => import('@/components/learn/clustering').then(m => ({ default: m.Clustering })))
// const SHAP = dynamic(() => import('@/components/learn/shap').then(m => ({ default: m.SHAP })))

export function generateStaticParams() {
  return ARTIFACTS.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const artifact = getArtifact(slug)
  if (!artifact) return {}

  const title = `${artifact.title} — Interactive Explainer`
  const description = artifact.description

  return {
    title,
    description,
    alternates: {
      canonical: `https://amirabdurrahim.com/learn/${slug}`,
    },
    openGraph: {
      title: `${artifact.title} — Interactive Explainer`,
      description,
      url: `https://amirabdurrahim.com/learn/${slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artifact.title} — Interactive Explainer`,
      description,
    },
  }
}

// Component map — uncomment entries as artifact components are built
// Using next/dynamic ensures each artifact is code-split per route
const ARTIFACT_COMPONENTS: Record<string, React.ComponentType> = {
  // 'gradient-descent': GradientDescent,
  // 'log-loss-cross-entropy': LogLossCrossEntropy,
  // 'pca': PCA,
  // 'regularization': Regularization,
  // 'clustering': Clustering,
  // 'shap': SHAP,
}

export default async function LearnArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const artifact = getArtifact(slug)
  if (!artifact) notFound()

  const { prev, next } = getAdjacentArtifacts(slug)
  const ArtifactComponent = ARTIFACT_COMPONENTS[slug]

  // JSON-LD LearningResource schema
  // Safe: all values are hardcoded strings from the metadata array, no user input
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: artifact.title,
    description: artifact.description,
    educationalLevel: 'Graduate',
    learningResourceType: 'Interactive simulation',
    teaches: artifact.subtopics,
    url: `https://amirabdurrahim.com/learn/${slug}`,
    author: {
      '@type': 'Person',
      name: 'Amir Abdur-Rahim',
    },
  }

  return (
    <PageTransition>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 pt-12 pb-24">
        {/* Back link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors mb-10
            font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M10 6H2M5 9L2 6l3-3" />
          </svg>
          Back to Learn
        </Link>

        {/* Artifact content */}
        {ArtifactComponent ? (
          <ArtifactComponent />
        ) : (
          <div className="text-center py-20 text-ink-subtle dark:text-night-muted">
            <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
              {artifact.number}/
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
              {artifact.title}
            </h1>
            <p className="text-[15px]">{artifact.description}</p>
            <p className="mt-4 text-[13px] text-ink-faint">Coming soon</p>
          </div>
        )}

        {/* Prev/Next navigation */}
        <LearnNav prev={prev} next={next} />
      </article>
    </PageTransition>
  )
}
```

- [ ] **Step 2: Verify all artifact routes render**

Run: `npm run dev`
Check: Navigate to `/learn/gradient-descent`, `/learn/pca`, etc. Each should show the placeholder with title, number, description, and "Coming soon." Back link returns to `/learn`. Prev/next links navigate between artifacts.

- [ ] **Step 3: Commit**

```bash
git add app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): add dynamic route with placeholder, back link, prev/next nav"
```

---

## Task 8: Sitemap Update

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add learn routes to sitemap**

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { ARTIFACTS } from '@/lib/learn/artifacts'

export default function sitemap(): MetadataRoute.Sitemap {
  const learnPages = ARTIFACTS.map((a) => ({
    url: `https://amirabdurrahim.com/learn/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: 'https://amirabdurrahim.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://amirabdurrahim.com/gallery',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://amirabdurrahim.com/learn',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...learnPages,
  ]
}
```

- [ ] **Step 2: Verify sitemap generates**

Run: `npm run dev`, then visit `http://localhost:3000/sitemap.xml`
Expected: 9 entries total (home, gallery, learn index, 6 artifact pages)

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(learn): add learn routes to sitemap"
```

---

## Task 9: Build Verification (Scaffold Complete)

Before starting the artifact conversions, verify the entire scaffold builds cleanly.

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: Pass (aside from the pre-existing interactive-headshot.tsx warning)

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Clean build. All `/learn` and `/learn/[slug]` routes generated. OG images generated.

- [ ] **Step 3: Commit any fixes needed**

If the build revealed issues, fix and commit.

---

## Tasks 10–15: Artifact Component Conversions

Each artifact gets its own task. The pattern is identical for all 6:

1. Read the source HTML file from `../data_mining_artifacts/`
2. Convert to a React client component with scrollable sections
3. Port Canvas logic into `useRef` + `useEffect` hooks
4. Style with Catppuccin tokens (CSS custom properties for Canvas, Tailwind classes for UI)
5. Add dark mode support via `MutationObserver` on `<html>` class
6. Add accessibility (ARIA labels, proper form controls)
7. Uncomment the import and component map entry in `app/learn/[slug]/page.tsx`
8. Verify in dev server
9. Commit

**Important patterns for ALL artifact components:**

- Each file starts with `"use client"`
- Uses `useScrollReveal` for section entrance animations
- Canvas colors read via `getComputedStyle(document.documentElement).getPropertyValue('--color-*')`
- Dark mode changes detected via `MutationObserver` on `document.documentElement` attributes
- Native `<input type="range">` for sliders, styled with Catppuccin tokens
- Canvas pointer events via `onPointerDown/Move/Up` (not mouse events)
- `prefers-reduced-motion` check: skip RAF animations, show static renders
- Cleanup: all `useEffect` hooks return cleanup functions for RAF, observers, listeners
- Section headings use unique IDs prefixed by artifact abbreviation (e.g., `gd-`, `pca-`, `reg-`, `cl-`, `shap-`)
- Each `<section>` has `aria-labelledby` pointing to its heading ID
- Canvas elements get `role="img"` with descriptive `aria-label`
- `SectionDivider` between sections, alternating backgrounds

### Task 10: Gradient Descent (`components/learn/gradient-descent.tsx`)

**Files:**
- Create: `components/learn/gradient-descent.tsx`
- Modify: `app/learn/[slug]/page.tsx` (uncomment import + map entry)

**Source:** `../data_mining_artifacts/gradient_descent_interactive_explainer.html`

- [ ] **Step 1: Read source artifact and understand structure**

The source has 4 tabs:
1. "Why gradients point downhill" — drag position on loss curve, shows gradient/negative gradient
2. "Learning rate" — step buttons, learning rate slider, path on loss surface
3. "Batch variants" — side-by-side batch/SGD/mini-batch paths on 2D loss landscape
4. "GD vs Gradient Boosting" — toggle between parameter space and function space views

Convert each tab into a scrollable section.

- [ ] **Step 2: Create the component**

Create `components/learn/gradient-descent.tsx` as a `"use client"` component. Port all 4 Canvas drawing functions, state management, and interactive controls. Follow the patterns listed above for dark mode, accessibility, reduced motion, and cleanup.

The component should export `GradientDescent` as a named export.

- [ ] **Step 3: Wire up in page.tsx**

In `app/learn/[slug]/page.tsx`:
- Uncomment the import: `import { GradientDescent } from '@/components/learn/gradient-descent'`
- Uncomment the map entry: `'gradient-descent': GradientDescent,`

- [ ] **Step 4: Verify in dev server**

Run: `npm run dev`
Check: Navigate to `/learn/gradient-descent`. All 4 sections render with working Canvas interactions, sliders, buttons. Toggle dark mode — Canvas colors update. Check reduced motion behavior. Verify on mobile viewport.

- [ ] **Step 5: Commit**

```bash
git add components/learn/gradient-descent.tsx app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): convert gradient descent artifact to React"
```

---

### Task 11: Log Loss & Cross-Entropy (`components/learn/log-loss-cross-entropy.tsx`)

**Files:**
- Create: `components/learn/log-loss-cross-entropy.tsx`
- Modify: `app/learn/[slug]/page.tsx` (uncomment import + map entry)

**Source:** `../data_mining_artifacts/normality_logloss_crossentropy.html`

- [ ] **Step 1: Read source and understand structure**

4 tabs: QQ plots → Log loss curve → Entropy & Gini → Unified connection chain. Statistical functions include normal inverse CDF (rational approximation).

- [ ] **Step 2: Create the component**

Export `LogLossCrossEntropy`. Port all Canvas drawing, statistical functions, and controls. Use same patterns as Task 10.

- [ ] **Step 3: Wire up in page.tsx**

Uncomment import and map entry.

- [ ] **Step 4: Verify in dev server**

Check all 4 sections, QQ plot resampling, loss curve slider, entropy/Gini comparison, connection chain. Dark mode, reduced motion, mobile.

- [ ] **Step 5: Commit**

```bash
git add components/learn/log-loss-cross-entropy.tsx app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): convert log loss & cross-entropy artifact to React"
```

---

### Task 12: PCA (`components/learn/pca.tsx`)

**Files:**
- Create: `components/learn/pca.tsx`
- Modify: `app/learn/[slug]/page.tsx`

**Source:** `../data_mining_artifacts/pca_dimensionality_reduction.html`

- [ ] **Step 1: Read source and understand structure**

5 tabs — the most complex artifact. Includes 2x2 eigendecomposition, correlated data generation (Gaussian RNG), interactive PC score calculator, misconception buster with stacked bar charts. Port the `pca2d()` function carefully.

- [ ] **Step 2: Create the component**

Export `PCA`. Port all 5 sections with Canvas logic.

- [ ] **Step 3: Wire up in page.tsx**

- [ ] **Step 4: Verify in dev server**

Test all 5 sections including the interactive score calculator and misconception scatter plot.

- [ ] **Step 5: Commit**

```bash
git add components/learn/pca.tsx app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): convert PCA artifact to React"
```

---

### Task 13: Regularization (`components/learn/regularization.tsx`)

**Files:**
- Create: `components/learn/regularization.tsx`
- Modify: `app/learn/[slug]/page.tsx`

**Source:** `../data_mining_artifacts/regularization_lambda_bias_variance.html`

- [ ] **Step 1: Read source and understand structure**

Simplest artifact — no tab system, just a single interactive page. Ridge/Lasso toggle, lambda slider, coefficient bars, bias-variance tradeoff chart, metrics cards, insight box. Convert into 2 scrollable sections: (1) coefficient visualization with Ridge/Lasso toggle, (2) bias-variance tradeoff chart.

- [ ] **Step 2: Create the component**

Export `Regularization`. Port Canvas logic for coefficient bars and tradeoff chart.

- [ ] **Step 3: Wire up in page.tsx**

- [ ] **Step 4: Verify in dev server**

- [ ] **Step 5: Commit**

```bash
git add components/learn/regularization.tsx app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): convert regularization artifact to React"
```

---

### Task 14: Clustering (`components/learn/clustering.tsx`)

**Files:**
- Create: `components/learn/clustering.tsx`
- Modify: `app/learn/[slug]/page.tsx`

**Source:** `../data_mining_artifacts/clustering_three_algorithms.html`

- [ ] **Step 1: Read source and understand structure**

3 tabs: K-means (with K-medoids toggle, step-through, elbow/silhouette) → Hierarchical (dendrogram + scatter) → DBSCAN (eps/minPts sliders, core/border/noise visualization). Data generators: `genBlobs()`, `genMoons()`, `genRing()`. Complex algorithms to port.

- [ ] **Step 2: Create the component**

Export `Clustering`. Port all 3 sections with Canvas logic, algorithm implementations, and data generators.

- [ ] **Step 3: Wire up in page.tsx**

- [ ] **Step 4: Verify in dev server**

Test all 3 algorithms with each data shape. Verify K-means stepping, dendrogram rendering, DBSCAN core/border/noise classification.

- [ ] **Step 5: Commit**

```bash
git add components/learn/clustering.tsx app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): convert clustering artifact to React"
```

---

### Task 15: SHAP (`components/learn/shap.tsx`)

**Files:**
- Create: `components/learn/shap.tsx`
- Modify: `app/learn/[slug]/page.tsx`

**Source:** `../data_mining_artifacts/shap_interpretability.html`

- [ ] **Step 1: Read source and understand structure**

4 tabs: Waterfall (instance slider, SHAP bars) → Beeswarm (scatter with color gradient) → Global importance (horizontal bar chart) → Shapley math (3-feature toy model with tables). Synthetic data generation for 200 loan instances.

- [ ] **Step 2: Create the component**

Export `SHAP`. Port all 4 sections with Canvas logic and data generation.

- [ ] **Step 3: Wire up in page.tsx**

- [ ] **Step 4: Verify in dev server**

Test waterfall instance navigation, beeswarm scatter rendering, global importance bars, Shapley math tables.

- [ ] **Step 5: Commit**

```bash
git add components/learn/shap.tsx app/learn/\[slug\]/page.tsx
git commit -m "feat(learn): convert SHAP artifact to React"
```

---

## Task 16: Final Build & CLAUDE.md Update

- [ ] **Step 1: Run full production build**

Run: `npm run build`
Expected: Clean build with all 8 learn pages (index + 6 artifacts + OG images) generated.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: Pass (aside from pre-existing interactive-headshot warning).

- [ ] **Step 3: Spot-check production build**

Run: `npm run start`
Check: Navigate through all learn pages, verify dark mode toggle, verify OG images load, verify prev/next nav, verify sitemap.xml has all entries.

- [ ] **Step 4: Update CLAUDE.md**

Update the following sections in `CLAUDE.md`:
- **File Structure:** Add `app/learn/`, `components/learn/`, `lib/learn/` entries
- **Key Patterns:** Add metadata-driven learn section pattern, Canvas dark mode via MutationObserver
- **Client components list:** Add learn-card, learn-nav, and all 6 artifact components
- **Nav section:** Note Learn pill with mauve accent

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for learn section"
```
