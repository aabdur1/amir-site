# DocDefend+ Case Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `/work/docdefend-agent` as case study 03 — an agent-led DocDefend+ study built on verified eval numbers — and add the Kaggle × Google AI Agents certification badge.

**Architecture:** One entry appended to the `CASE_STUDIES` array in `lib/work/case-studies.ts` drives everything: the `/work` index card, the `/work/[slug]` page, prev/next nav, the sitemap entry, the per-slug OG card, and both JSON-LD schemas. The only structural change is a schema extension adding two optional visual payloads (`figure`, `plate`) with section-level boolean flags, mirroring the existing `embed` pattern exactly.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4 (CSS-first `@theme`), vitest + Testing Library, sharp (image crop, already a dependency at 0.34.5).

**Spec:** `docs/superpowers/specs/2026-08-04-docdefend-case-study-design.md`
**Review:** `docs/superpowers/specs/2026-08-04-docdefend-case-study-design-review.md`
**Branch:** `feat/docdefend-case-study` (already created; spec commits already on it)

## Global Constraints

- **No component libraries, no icon libraries.** All SVG is inline and hand-written.
- **No new npm dependencies.** sharp is already present and is used only in a one-off crop step, not at build or runtime.
- **Minimum readable text size is 12px.** No `text-[10px]` or `text-[11px]`, and no SVG `font-size` below 12 in a viewBox that renders 1:1 at 320px.
- **All drawn strokes use the shared `draw-stroke` + `is-drawn` pair** so the sitewide `prefers-reduced-motion` override in `globals.css` renders them fully drawn. Never put `draw-stroke` on a dashed stroke — it sets `stroke-dasharray: 100` and destroys the dash pattern.
- **No shorthand/longhand mixing in inline styles.** Fold `animationDelay` into the `animation` shorthand.
- **320px must not scroll horizontally.** Verify `document.documentElement.scrollWidth === 320`.
- **Interviewee de-identification — by specialty only.** No employer type ("VA", "private practice", "county hospital"), no tenure ("after 15 years"), no gendered pronouns. Restructure sentences rather than reaching for "he"/"she". Only public-capacity figures may be named.
- **Every number on the page must trace to the spec's Verified facts table.** Do not introduce a figure that is not in that table. Specifically forbidden: any accuracy, pilot, or user-count claim, and any assertion that a one-shot call was *observed* hallucinating.
- **Accent is `sapphire`** for this study, matching its existing projects-card accent.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `lib/work/case-studies.ts` | Case-study data + types (single source of truth) | Modify — add `CaseStudyFigure`, `CaseStudyPlate`, section flags, and the 03 entry |
| `lib/work/case-studies.test.ts` | Data-integrity invariants | Modify — bump count, add figure/plate invariants |
| `components/work/grounding-pipeline.tsx` | The drawn architecture SVG | **Create** |
| `components/work/case-study-plate.tsx` | Mounted-print screenshot frame | **Create** |
| `components/work/case-study-article.tsx` | Renders a study's body | Modify — add figure + plate branches |
| `public/work/docdefend-plate.png` | Plate asset | **Create** (sharp crop) |
| `components/projects.tsx` | Homepage projects bento | Modify — DocDefend `url` → internal |
| `lib/badges.ts` | Badge data + classifier | Modify — add Kaggle badge, extend `DATA_PATTERN` |
| `lib/badges.test.ts` | Badge tests | Modify — add badge to `MANUAL_NAMES`, add classifier cases |

---

## Task 1: Schema extension for figure and plate

**Files:**
- Modify: `lib/work/case-studies.ts:31-74` (interfaces)
- Test: `lib/work/case-studies.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `CaseStudyFigure { kind: 'grounding-pipeline'; caption: string }`, `CaseStudyPlate { src: string; alt: string; width: number; height: number; caption: string }`, `CaseStudySection.figure?: boolean`, `CaseStudySection.plate?: boolean`, `CaseStudy.figure?: CaseStudyFigure`, `CaseStudy.plate?: CaseStudyPlate`

- [ ] **Step 1: Write the failing tests**

Append to `lib/work/case-studies.test.ts`, inside the existing `describe('CASE_STUDIES sections, metrics, links, embed', ...)` block (before its closing `})`):

```ts
  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: any section flagged figure: true requires the study to define a figure, at most one such section',
    (_slug, c) => {
      const figureSections = c.sections.filter((s) => s.figure === true)
      if (figureSections.length > 0) {
        expect(c.figure).toBeDefined()
      }
      expect(figureSections.length).toBeLessThanOrEqual(1)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: any section flagged plate: true requires the study to define a plate, at most one such section',
    (_slug, c) => {
      const plateSections = c.sections.filter((s) => s.plate === true)
      if (plateSections.length > 0) {
        expect(c.plate).toBeDefined()
      }
      expect(plateSections.length).toBeLessThanOrEqual(1)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: figure (when present) has a known kind and a non-empty caption',
    (_slug, c) => {
      if (!c.figure) return
      expect(['grounding-pipeline']).toContain(c.figure.kind)
      expect(c.figure.caption.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: plate (when present) has a local src, alt text, positive integer dimensions, and a caption',
    (_slug, c) => {
      if (!c.plate) return
      expect(c.plate.src).toMatch(/^\/[\w\-/]+\.(png|jpg|webp)$/)
      expect(c.plate.alt.trim().length).toBeGreaterThan(0)
      expect(c.plate.caption.trim().length).toBeGreaterThan(0)
      expect(Number.isInteger(c.plate.width)).toBe(true)
      expect(Number.isInteger(c.plate.height)).toBe(true)
      expect(c.plate.width).toBeGreaterThan(0)
      expect(c.plate.height).toBeGreaterThan(0)
    },
  )
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/work/case-studies.test.ts`
Expected: FAIL — TypeScript errors, because `s.figure`, `c.figure`, `s.plate`, and `c.plate` do not exist on the types yet.

- [ ] **Step 3: Add the types**

In `lib/work/case-studies.ts`, insert after the `CaseStudyBar` interface (currently ending at line 29):

```ts
export interface CaseStudyFigure {
  // Selects the drawn diagram component. Add a kind here and a matching entry
  // in FIGURES (case-study-article.tsx) to introduce a new one.
  kind: 'grounding-pipeline'
  // Mono caption rendered under the figure — say what the marks mean.
  caption: string
}

export interface CaseStudyPlate {
  // Local path under /public. Rendered as a "mounted print" inside fixed
  // registration marks, same treatment as the Spotify featured card.
  src: string
  alt: string
  // Intrinsic pixel dimensions of the asset, for next/image.
  width: number
  height: number
  caption: string
}
```

Then extend `CaseStudySection` (currently lines 31-37) so it reads:

```ts
export interface CaseStudySection {
  heading: string
  // Each paragraph is one string; rendered as its own <p>.
  body: string[]
  // Render the study's embed (if any) under this section's paragraphs.
  embed?: boolean
  // Render the study's drawn figure under this section's paragraphs.
  figure?: boolean
  // Render the study's screenshot plate under this section's paragraphs.
  plate?: boolean
}
```

And add to the `CaseStudy` interface, immediately after the `embed?: CaseStudyEmbed` line:

```ts
  figure?: CaseStudyFigure
  plate?: CaseStudyPlate
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/work/case-studies.test.ts`
Expected: PASS. The new invariants pass vacuously — neither existing study defines a figure or plate.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/work/case-studies.ts lib/work/case-studies.test.ts
git commit -m "feat: add figure and plate to the case-study schema

Mirrors the existing embed pattern — a section-level boolean flag
plus a top-level payload — so a study can carry a drawn diagram and
a screenshot plate without a component edit per study."
```

---

## Task 2: The grounding pipeline figure

**Files:**
- Create: `components/work/grounding-pipeline.tsx`
- Test: `components/work/grounding-pipeline.test.tsx`

**Interfaces:**
- Consumes: `useScrollReveal` from `@/lib/hooks` (returns `[ref, visible]`)
- Produces: `export function GroundingPipeline(): JSX.Element` — takes no props; the caption is rendered by the article, not by this component.

**Design note for the implementer:** the entire visual argument is one distinction — **every deterministic stage is a hard-edged rectangle, and the model is the single rounded shape.** Do not "improve" this by rounding the gates or adding decoration.

**The viewBox width is load-bearing, not arbitrary.** The article column is `max-w-5xl px-6` (`case-study-article.tsx:111`), so at a 320px viewport the content box is `320 − 48 = 272px`. The viewBox is therefore **272** wide, which makes the SVG render 1:1 there and keeps the 12px labels at exactly 12px — the site's readable floor. A 320-wide viewBox would render at 0.85 scale and shrink those labels to ~10.2px, violating the Global Constraint. If you change the page padding, recompute this.

- [ ] **Step 1: Write the failing test**

Create `components/work/grounding-pipeline.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { GroundingPipeline } from '@/components/work/grounding-pipeline'

describe('GroundingPipeline', () => {
  it('exposes the diagram to assistive tech as a single labelled image', () => {
    render(<GroundingPipeline />)
    const img = screen.getByRole('img')
    expect(img).toHaveAccessibleName(/grounding/i)
  })

  it('names every stage of the pipeline in the accessible description', () => {
    render(<GroundingPipeline />)
    const img = screen.getByRole('img')
    const name = img.getAttribute('aria-label') ?? ''
    for (const stage of ['mask', 'Gemini', 'gate', 'terminology', 'reconcile']) {
      expect(name.toLowerCase()).toContain(stage.toLowerCase())
    }
  })

  it('draws every solid stroke through the shared draw-stroke class', () => {
    const { container } = render(<GroundingPipeline />)
    const drawn = container.querySelectorAll('.draw-stroke')
    expect(drawn.length).toBeGreaterThan(0)
    // draw-stroke relies on pathLength normalisation; a stroke without it
    // animates from the wrong dash length.
    for (const el of Array.from(drawn)) {
      expect(el.getAttribute('pathLength')).toBe('100')
    }
  })

  it('never puts draw-stroke on a dashed stroke (it would destroy the dash pattern)', () => {
    const { container } = render(<GroundingPipeline />)
    for (const el of Array.from(container.querySelectorAll('.draw-stroke'))) {
      expect(el.getAttribute('stroke-dasharray')).toBeNull()
    }
  })

  it('keeps every label at or above the 12px readable-text floor', () => {
    const { container } = render(<GroundingPipeline />)
    const texts = container.querySelectorAll('text')
    expect(texts.length).toBeGreaterThan(0)
    for (const t of Array.from(texts)) {
      expect(Number(t.getAttribute('font-size'))).toBeGreaterThanOrEqual(12)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/work/grounding-pipeline.test.tsx`
Expected: FAIL — "Failed to resolve import '@/components/work/grounding-pipeline'".

- [ ] **Step 3: Write the component**

Create `components/work/grounding-pipeline.tsx`:

```tsx
'use client'

import { useScrollReveal } from '@/lib/hooks'

// The enforcement path for the DocDefend+ agent (/work/docdefend-agent).
//
// The whole visual argument is carried by mark shape: every deterministic
// stage is a hard-edged rectangle, and the model is the single rounded one.
// Strokes self-draw on scroll reveal through the shared .draw-stroke /
// .is-drawn pair, so the sitewide prefers-reduced-motion override in
// globals.css renders them fully drawn without any extra handling here.
//
// The viewBox is 272 wide because the article column is max-w-5xl px-6, so a
// 320px viewport leaves a 272px content box. Rendering 1:1 there keeps the
// 12px labels at exactly 12px — the site's readable floor. A wider viewBox
// would scale them below it.

const GATE_STROKE = 'stroke-sapphire dark:stroke-sapphire-dark draw-stroke'
const MODEL_STROKE = 'stroke-mauve dark:stroke-mauve-dark draw-stroke'
const OVERRIDE_STROKE = 'stroke-peach dark:stroke-peach-dark draw-stroke'
const CONNECTOR = 'stroke-ink-faint dark:stroke-night-border draw-stroke'

const TITLE = 'fill-ink dark:fill-night-text'
const SUBTITLE = 'fill-ink-subtle dark:fill-night-muted'

const BOX_X = 10
const BOX_W = 252
const CENTER = 136

const DESCRIPTION =
  'Pipeline diagram. A note and its claimed codes enter a deterministic PII ' +
  'firewall that masks identifiers before the model. Gemini at temperature ' +
  'zero is the only probabilistic stage. Its tool calls pass a structural ' +
  'gate that allowlists tools and scrubs identifiers a second time, then ' +
  'reach NLM and CMS terminology lookups. Finally reconcile_grounding ' +
  'compares the report against what the tools actually verified and ' +
  'downgrades any unbacked claim to NOT_SUPPORTED.'

/** One stage box: hard-edged for deterministic code, rounded for the model. */
function Stage({
  y,
  height,
  rx,
  stroke,
  title,
  subtitle,
}: {
  y: number
  height: number
  rx: number
  stroke: string
  title: string
  subtitle: string
}) {
  return (
    <g>
      <rect
        x={BOX_X}
        y={y}
        width={BOX_W}
        height={height}
        rx={rx}
        fill="none"
        strokeWidth={1.5}
        className={stroke}
        pathLength={100}
      />
      <text
        x={CENTER}
        y={y + 22}
        textAnchor="middle"
        fontSize={13}
        className={`${TITLE} font-[family-name:var(--font-mono)]`}
      >
        {title}
      </text>
      <text
        x={CENTER}
        y={y + 40}
        textAnchor="middle"
        fontSize={12}
        className={`${SUBTITLE} font-[family-name:var(--font-mono)]`}
      >
        {subtitle}
      </text>
    </g>
  )
}

/** Vertical connector between two stages. */
function Connector({ from, to }: { from: number; to: number }) {
  return (
    <line
      x1={CENTER}
      y1={from}
      x2={CENTER}
      y2={to}
      strokeWidth={1}
      className={CONNECTOR}
      pathLength={100}
    />
  )
}

export function GroundingPipeline() {
  const [ref, visible] = useScrollReveal()

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`mx-auto max-w-md ${visible ? 'is-drawn' : ''}`}
    >
      <svg
        viewBox="0 0 272 430"
        className="w-full h-auto"
        role="img"
        aria-label={`Grounding pipeline. ${DESCRIPTION}`}
      >
        <text
          x={CENTER}
          y={14}
          textAnchor="middle"
          fontSize={12}
          className={`${SUBTITLE} font-[family-name:var(--font-mono)]`}
        >
          note + claimed codes
        </text>

        <Connector from={22} to={40} />

        <Stage
          y={40}
          height={56}
          rx={2}
          stroke={GATE_STROKE}
          title="mask identifiers"
          subtitle="boundary 1 — before the model"
        />

        <Connector from={96} to={114} />

        <Stage
          y={114}
          height={56}
          rx={28}
          stroke={MODEL_STROKE}
          title="Gemini"
          subtitle="temperature 0 — the only guess"
        />

        <Connector from={170} to={188} />

        <Stage
          y={188}
          height={56}
          rx={2}
          stroke={GATE_STROKE}
          title="tool gate + scrub"
          subtitle="boundary 2 — outgoing args"
        />

        <Connector from={244} to={262} />

        <Stage
          y={262}
          height={56}
          rx={2}
          stroke={GATE_STROKE}
          title="NLM / CMS lookup"
          subtitle="real terminology data"
        />

        <Connector from={318} to={336} />

        <Stage
          y={336}
          height={56}
          rx={2}
          stroke={OVERRIDE_STROKE}
          title="reconcile_grounding()"
          subtitle="unbacked → NOT_SUPPORTED"
        />

        <Connector from={392} to={410} />

        <text
          x={CENTER}
          y={424}
          textAnchor="middle"
          fontSize={12}
          className={`${SUBTITLE} font-[family-name:var(--font-mono)]`}
        >
          defensibility report
        </text>
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/work/grounding-pipeline.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/work/grounding-pipeline.tsx components/work/grounding-pipeline.test.tsx
git commit -m "feat: grounding pipeline figure for the DocDefend case study

Deterministic stages are hard-edged rectangles; the model is the one
rounded shape. Self-draws on scroll reveal via draw-stroke/is-drawn,
so the sitewide reduced-motion override covers it."
```

---

## Task 3: The plate component and asset

**Files:**
- Create: `components/work/case-study-plate.tsx`
- Create: `public/work/docdefend-plate.png`
- Test: `components/work/case-study-plate.test.tsx`

**Interfaces:**
- Consumes: `CaseStudyPlate` type from Task 1
- Produces: `export function CaseStudyPlate({ plate }: { plate: CaseStudyPlateData }): JSX.Element`

**Naming note:** the type is `CaseStudyPlate` and so is the component. Import the type under an alias to avoid a collision:
`import type { CaseStudyPlate as CaseStudyPlateData } from '@/lib/work/case-studies'`

- [ ] **Step 1: Generate the asset**

The crop coordinates below are verified — they capture the Clinical Note input panel, the `25 / LOW` score ring, the `Overcoded` badge, the `99214 → 99213` comparison, and the `-$40 per visit` downcoding callout.

```bash
node -e "
const sharp = require('sharp');
sharp('/Users/amirabdurrahim/Documents/MSMIS/IDS594/mvp/analysis-results.png')
  .extract({ left: 0, top: 130, width: 1192, height: 640 })
  .png({ compressionLevel: 9 })
  .toFile('public/work/docdefend-plate.png')
  .then(i => console.log('wrote', i.width + 'x' + i.height, Math.round(i.size / 1024) + 'KB'));
"
```

Expected output: `wrote 1192x640 117KB`

- [ ] **Step 2: Verify the asset visually**

Open `public/work/docdefend-plate.png`. It must show the Clinical Note panel on the left and the Defensibility Analysis panel on the right, ending cleanly below the red downcoding callout. If the bottom edge clips a card mid-way, the source screenshot differs from the one this plan was written against — stop and report rather than guessing new coordinates.

- [ ] **Step 3: Write the failing test**

Create `components/work/case-study-plate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { CaseStudyPlate } from '@/components/work/case-study-plate'

const plate = {
  src: '/work/docdefend-plate.png',
  alt: 'DocDefend+ analysing a clinical note',
  width: 1192,
  height: 640,
  caption: 'synthetic demo data · not clinical use',
}

describe('CaseStudyPlate', () => {
  it('renders the image with its alt text', () => {
    render(<CaseStudyPlate plate={plate} />)
    expect(screen.getByAltText(plate.alt)).toBeInTheDocument()
  })

  it('renders the caption', () => {
    render(<CaseStudyPlate plate={plate} />)
    expect(screen.getByText(plate.caption)).toBeInTheDocument()
  })

  it('renders four registration marks, each with a visible border edge', () => {
    const { container } = render(<CaseStudyPlate plate={plate} />)
    const marks = container.querySelectorAll('.reg-mark')
    expect(marks).toHaveLength(4)
    // .reg-mark sets border-color only — without a border-width utility the
    // mark is invisible. Every mark must carry two edge classes.
    for (const mark of Array.from(marks)) {
      const cls = mark.className
      expect(/border-[tb]\b/.test(cls)).toBe(true)
      expect(/border-[lr]\b/.test(cls)).toBe(true)
    }
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run components/work/case-study-plate.test.tsx`
Expected: FAIL — "Failed to resolve import '@/components/work/case-study-plate'".

- [ ] **Step 5: Write the component**

Create `components/work/case-study-plate.tsx`:

```tsx
import Image from 'next/image'
import type { CaseStudyPlate as CaseStudyPlateData } from '@/lib/work/case-studies'

// A product screenshot presented as a mounted print: the image keeps its own
// light styling in both themes and sits inside four fixed registration
// corners. Same print metaphor as the headshot and the Spotify featured card
// — the plate is the artefact, the marks are the mount.

export function CaseStudyPlate({ plate }: { plate: CaseStudyPlateData }) {
  return (
    <figure className="mx-auto max-w-3xl">
      {/* .reg-mark already declares position:absolute and border-color; the
          border-t/-l/-b/-r utilities supply the width that makes it visible.
          Matches interactive-headshot.tsx, the reference implementation. */}
      <div className="relative px-3 py-3 sm:px-5 sm:py-5">
        <span aria-hidden="true" className="reg-mark top-0 left-0 border-t border-l hidden lg:block" />
        <span aria-hidden="true" className="reg-mark top-0 right-0 border-t border-r hidden lg:block" />
        <span aria-hidden="true" className="reg-mark bottom-0 left-0 border-b border-l hidden lg:block" />
        <span aria-hidden="true" className="reg-mark bottom-0 right-0 border-b border-r hidden lg:block" />
        <Image
          src={plate.src}
          alt={plate.alt}
          width={plate.width}
          height={plate.height}
          sizes="(min-width: 768px) 768px, 100vw"
          className="w-full h-auto rounded-md border border-cream-border dark:border-night-border"
        />
      </div>
      <figcaption className="mt-3 text-center font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
        {plate.caption}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/work/case-study-plate.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add components/work/case-study-plate.tsx components/work/case-study-plate.test.tsx public/work/docdefend-plate.png
git commit -m "feat: case-study plate component and DocDefend asset

Mounted-print treatment matching the Spotify featured card: the
screenshot keeps its light styling in both themes inside four fixed
registration corners."
```

---

## Task 4: Wire figure and plate into the article renderer

**Files:**
- Modify: `components/work/case-study-article.tsx:1-7` (imports), `:98-102` (the embed branch)

**Interfaces:**
- Consumes: `GroundingPipeline` (Task 2), `CaseStudyPlate` component (Task 3), `CaseStudyFigure`/`CaseStudyPlate` types (Task 1)
- Produces: no new exports — `CaseStudyArticle` gains the ability to render `figure` and `plate` under a flagged section.

- [ ] **Step 1: Add the imports**

In `components/work/case-study-article.tsx`, after the existing `TableauEmbed` import on line 6, add:

```tsx
import { GroundingPipeline } from '@/components/work/grounding-pipeline'
import { CaseStudyPlate } from '@/components/work/case-study-plate'
```

- [ ] **Step 2: Add the figure registry**

Immediately after the import block (before `function MetricTiles`), add:

```tsx
// Maps a study's figure.kind to its component. Adding a diagram means adding
// a kind to CaseStudyFigure and an entry here — no per-study renderer edits.
const FIGURES: Record<string, () => React.ReactElement> = {
  'grounding-pipeline': GroundingPipeline,
}
```

- [ ] **Step 3: Render figure and plate under the flagged section**

In `ArticleSection`, replace the existing embed block (currently lines 98-102):

```tsx
      {section.embed && study.embed && (
        <div className="mt-8">
          <TableauEmbed embed={study.embed} />
        </div>
      )}
```

with:

```tsx
      {section.embed && study.embed && (
        <div className="mt-8">
          <TableauEmbed embed={study.embed} />
        </div>
      )}
      {section.figure && study.figure && FIGURES[study.figure.kind] && (
        <div className="mt-8">
          {(() => {
            const Figure = FIGURES[study.figure.kind]
            return <Figure />
          })()}
          <p className="mt-4 text-center font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
            {study.figure.caption}
          </p>
        </div>
      )}
      {section.plate && study.plate && (
        <div className="mt-8">
          <CaseStudyPlate plate={study.plate} />
        </div>
      )}
```

- [ ] **Step 4: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass. Nothing renders differently yet — no study sets `figure` or `plate`.

- [ ] **Step 5: Commit**

```bash
git add components/work/case-study-article.tsx
git commit -m "feat: render figure and plate in case-study articles

Both hang off a section-level flag plus a top-level payload, exactly
like the existing Tableau embed, so figure.kind selects the diagram
component from a registry rather than a per-study branch."
```

---

## Task 5: The DocDefend+ case study entry

**Files:**
- Modify: `lib/work/case-studies.ts` (append the third entry to `CASE_STUDIES`)
- Modify: `lib/work/case-studies.test.ts:15` (count 2 → 3)

**Interfaces:**
- Consumes: every type from Task 1; the `grounding-pipeline` figure kind from Task 2; `/work/docdefend-plate.png` from Task 3
- Produces: `CASE_STUDIES[2]` with slug `docdefend-agent`

**Prose constraints — re-read before writing:** de-identify by specialty only (no employer, no tenure, no gendered pronouns); every number must appear in the spec's Verified facts table; no accuracy/pilot/user claims; do not assert an observed hallucination.

- [ ] **Step 1: Update the count assertion**

In `lib/work/case-studies.test.ts`, change line 15 from:

```ts
    expect(CASE_STUDIES).toHaveLength(2)
```

to:

```ts
    expect(CASE_STUDIES).toHaveLength(3)
```

And update the `it(...)` description on line 12 from `'is a non-empty array (currently two published studies)'` to `'is a non-empty array (currently three published studies)'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/work/case-studies.test.ts`
Expected: FAIL — `expected [ …2 items ] to have a length of 3 but got 2`.

- [ ] **Step 3: Append the entry**

In `lib/work/case-studies.ts`, add this as the third element of `CASE_STUDIES`, after the `airline-flight-patterns` object's closing `},`:

```ts
  {
    slug: 'docdefend-agent',
    number: '03',
    title: 'DocDefend+ — Grounding a Billing Agent in Real Terminology Data',
    shortTitle: 'DocDefend+',
    summary:
      'An ADK and Gemini agent that verifies every billing code against live NLM terminology data before it may enter a defensibility report, with a two-boundary PII firewall and a deterministic reconciler that overrides unbacked grounding claims. 16 of 16 evaluation cases pass, across 110 checks.',
    lead:
      'A language model asked to review a billing code can describe one that does not exist — confidently, in fluent clinical English. A prompt can ask a model to be careful; it cannot make it check. This agent makes an ungrounded code structurally unshippable: every code is verified against live NLM terminology data before it can enter the report, and a deterministic reconciler overrides any grounding the model claims but the tools never backed.',
    role: 'Solo agent design, guardrails, and evaluation — the underlying MVP is a team project',
    provenance: 'Graduate coursework · UIC MS MIS · agent built for the Kaggle × Google 5-Day AI Agents Intensive',
    accent: 'sapphire',
    depth: 'full',
    tech: ['Google ADK', 'Gemini', 'MCP', 'Python', 'Claude API', 'React'],
    metrics: [
      { value: '16/16', label: 'Evaluation cases passed (110/110 checks)' },
      { value: '68', label: 'Unit tests passing, zero API calls' },
      { value: '2', label: 'PII firewall boundaries, 6 identifier kinds' },
      { value: '12.2s', label: 'Average per live evaluation case' },
    ],
    figure: {
      kind: 'grounding-pipeline',
      caption: 'fig. 03 · every hard-edged stage is deterministic code — only the rounded one guesses',
    },
    plate: {
      src: '/work/docdefend-plate.png',
      alt: 'The DocDefend+ interface: a clinical note on the left, and on the right a defensibility score of 25 out of 100, an "Overcoded" flag, a selected code of 99214 against a documented level of 99213, and a warning that downcoding would reduce reimbursement by about $40 per visit.',
      width: 1192,
      height: 640,
      caption: 'the underlying app · synthetic note, demo-grade rates',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'A single language-model call can bless a billing code that does not exist. It can also bless a real code the documentation does not support. Both produce the same outcome for a practice: a claim that gets denied, downcoded, or flagged in an audit. The model is not being careless — emitting text is the only move it has. It never checks anything.',
          'So I stopped asking it to be careful and made checking structural. Every code the agent reports must first come back from a terminology tool queried against live NLM data. A tracker records what the tools actually returned, and after the run a reconciler compares the report against that record — any code claiming to be grounded without tool backing is downgraded to NOT_SUPPORTED and flagged high risk. A model that lies about its own grounding cannot ship the lie.',
          'Run against gemini-2.5-flash at temperature 0 on 16 July 2026, the suite passes 16 of 16 cases across 110 assertions, including three prompt-injection attempts and two fabricated codes. Every assertion is deterministic — there is no model judging the model.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'DocDefend+ started as a team project for IDS 594, Entrepreneurship with AI, at UIC: a pre-claim QA layer for small medical practices. A provider or billing coder pastes a clinical note, selects the CPT and ICD-10 codes they intend to bill, and gets back a defensibility report. The agent described here is separate, solo work, built afterward for the Kaggle and Google 5-Day AI Agents Intensive.',
          'The problem came out of customer discovery rather than a whiteboard. A physiatrist self-estimated their own coding accuracy at 75 to 80 percent. A family-medicine physician outsources coding entirely to a third party and runs roughly 10 percent denials while believing the practice is undercoded. An anesthesiologist pointed to EMR transitions as a reliable source of miscoding. None of them described a documentation problem — they described a verification gap.',
          'That gap is the whole thesis. An AI scribe writes the note. A billing company picks the codes. Payers increasingly use automated review to deny or downcode. Nobody checks whether the note actually supports the codes before the claim goes out.',
        ],
      },
      {
        heading: 'What a one-shot call cannot do',
        body: [
          'The original app makes one Claude call per analysis and asks for structured JSON back. That works well for reading a note and reasoning about medical decision-making complexity. It cannot verify that a code exists, because nothing in the loop ever leaves the model.',
          'This is the clinical version of a failure mode that shows up wherever models name things: a plausible identifier, correctly formatted, described fluently, that simply is not real. Prompting harder does not fix it. Neither does temperature 0 — a deterministic wrong answer is still wrong. The fix has to sit outside the model.',
        ],
      },
      {
        heading: 'How grounding is enforced',
        figure: true,
        body: [
          'The instruction forbids describing any code from memory and routes each code type to its own tool — CPT and E/M to a curated reference, ICD-10 to a search against NLM data. The terminology lookups come from an MCP server I built separately against the NLM public APIs.',
          'Deterministic code sits at every boundary. A structural gate allowlists which tools may run at all. A PII firewall masks identifiers twice: once before anything reaches Gemini, and again on every outgoing tool argument, covering six identifier kinds. A tracker records only codes a tool actually returned — results marked not-found are never counted as grounded.',
          'Then the output gate. After the run, the reconciler compares what the report claims against what the tools verified, and downgrades every unbacked claim. Tool errors are held distinct from genuine no-matches: on a network failure the agent retries, and on repeated failure it reports the code as unverifiable rather than invalid. It fails closed in both directions.',
        ],
      },
      {
        heading: 'Evaluating it honestly',
        plate: true,
        body: [
          'The suite is 16 labelled cases: grounded real codes, fabricated codes, over- and under-coded E/M levels, real codes the documentation does not support, three prompt-injection attempts, the PII firewall, and malformed input rejected before the model is ever called. Thirteen run live against the API; three are static and need no network. All 110 assertions are deterministic.',
          'An earlier identical run scored 14 of 16. Both failures were real and both were fixed: the model once emitted an out-of-vocabulary value for a medical-decision-making element, so the permitted vocabulary is now pinned in the instruction; and it made a borderline call between two E/M levels, so the CMS two-of-three rule is now explicit. Worth stating plainly — model output varies between runs even at temperature 0, so a future run may not be a clean sweep. The deterministic guardrails do not vary, which is precisely the argument for putting the guarantees there instead of in the prompt.',
          'One practical note from the run. The free tier allowed about five requests a minute and roughly twenty a day, against a suite that needs sixty to eighty. The full pass used a billed key, and a static-only mode exists so the deterministic cases stay runnable at zero cost.',
        ],
      },
      {
        heading: 'Limitations',
        body: [
          'Name detection is regex-only. Labelled names are masked; a name in unlabelled prose is not. Real de-identification needs a local model or a named-entity pass, which is the next thing I would build. Date masking is deliberately over-broad — every full date is treated as an identifier, so visit dates get masked too, because over-redaction is the safe direction to err.',
          'Grounded means the code exists in real terminology data. It does not mean the documentation supports it — that judgment lives in a separate status field, and conflating the two would be exactly the kind of overclaim this project exists to prevent. The CPT reference is 12 curated codes with approximate national rates, because CPT is licensed and absent from free NLM data, so every dollar figure is demo-grade. Time-based E/M billing is not modelled at all.',
          'And the honest headline: this runs on synthetic notes. There has been no pilot, no accuracy validation against real claim outcomes, and no clinical use. Real validation needs real notes, which needs compliance work that has not been funded. Until then the eval suite measures whether the guardrails hold — not whether the clinical judgment is correct.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'Three things, in order. Replace regex name detection with a local de-identification pass, so the firewall stops depending on how a note happens to be formatted. Add time-based E/M as a billing path — it is a legitimate route under CMS and common for new patients, and its absence was the first gap a physician found when reviewing the product. Then validation: a set of notes with known claim outcomes, scored against the agent, which is the only evidence that would justify calling any of this accurate.',
        ],
      },
    ],
    links: [
      { label: 'Try the live app', href: 'https://www.docdefend.health', external: true },
      { label: 'Agent source on GitHub', href: 'https://github.com/aabdur1/docdefend-mvp', external: true },
      { label: 'The MCP server I built', href: 'https://github.com/aabdur1/healthcare-terminology-mcp', external: true },
    ],
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/work/case-studies.test.ts`
Expected: PASS. The figure and plate invariants from Task 1 now exercise real data.

- [ ] **Step 5: Verify the page renders**

Run: `npm run dev`, then open `http://localhost:3000/work/docdefend-agent`.

Confirm: the pipeline figure draws in under "How grounding is enforced"; the plate appears under "Evaluating it honestly"; four metric tiles; three outbound link buttons; `/work` now shows three cards.

- [ ] **Step 6: Commit**

```bash
git add lib/work/case-studies.ts lib/work/case-studies.test.ts
git commit -m "feat: publish DocDefend+ as case study 03

Agent-led: leads with the grounding finding and its 16/16 eval
result, with the IDS 594 venture as the context that produced the
problem. Interviewees de-identified by specialty only. Every number
traces to the spec's verified-facts table."
```

---

## Task 6: Point the projects card at the case study

**Files:**
- Modify: `components/projects.tsx:38`

- [ ] **Step 1: Change the url**

In `components/projects.tsx`, change line 38 from:

```tsx
    url: "https://www.docdefend.health",
```

to:

```tsx
    url: "/work/docdefend-agent",
```

The card already branches on a leading `/` to render an internal `next/link` without `target="_blank"`, so no other change is needed. This matches how the Spotify card points inward; the live app stays reachable from the case study's own links.

- [ ] **Step 2: Verify both link behaviours**

Run: `npm run dev`, open `http://localhost:3000`, scroll to "Things I've Built".

Confirm: the DocDefend+ card navigates in-tab to `/work/docdefend-agent` and has no external-link arrow; from there, "Try the live app" opens `docdefend.health` in a new tab.

- [ ] **Step 3: Commit**

```bash
git add components/projects.tsx
git commit -m "feat: point the DocDefend projects card at its case study

Matches the Spotify card's internal-link pattern. The live app is
still linked from the study itself."
```

---

## Task 7: Kaggle certification badge

**Files:**
- Modify: `lib/badges.ts:30-61` (`manualBadges`), `:148` (`DATA_PATTERN`)
- Modify: `lib/badges.test.ts:9-14` (`MANUAL_NAMES`), `:73-110` (`badgeGroup` suite)
- Asset: `public/badges/kaggle-google-ai-agents.png` — **already in place** (537×572, transparent background, committed in `a0a2712`). No cropping or renaming step.

- [ ] **Step 1: Write the failing tests**

In `lib/badges.test.ts`, add to the `MANUAL_NAMES` array (currently lines 9-14) as a fifth entry:

```ts
  "5-Day AI Agents: Intensive Vibe Coding Course",
```

Then add to the `it.each([...])('classifies "%s" as "data"')` list inside the `describe("badgeGroup()")` block:

```ts
    "5-Day AI Agents: Intensive Vibe Coding Course",
```

And add this test inside the same `describe("badgeGroup()")` block:

```ts
  it("classifies agent-related certifications as data, not cloud", () => {
    expect(badgeGroup(namedBadge("5-Day AI Agents: Intensive Vibe Coding Course"))).toBe("data");
    // Guard the widened keyword: it must not swallow the security badges.
    expect(badgeGroup(namedBadge("Zscaler Zero Trust Certified Architect"))).toBe("cloud");
    expect(badgeGroup(namedBadge("AWS Cloud Quest: Cloud Practitioner"))).toBe("cloud");
  });
```

**Also update the hardcoded sort-order assertion.** `expectManualOnlySortedNewestFirst` (lines 333-342) pins the manual badges in date-descending order and is used by five tests in the failure-handling block. The new badge is dated `2026-07`, newer than every existing manual badge, so it sorts **first**. Change its `toEqual` array from:

```ts
    expect(badges.map((b) => b.name)).toEqual([
      "Building with the Claude API", // 2026-05
      "SnowPro Associate: Platform Certification", // 2026-03
      "SANS AWS Skills to Jobs CTF — Top 20 Regional", // 2026-03
      "Zscaler Zero Trust Certified Architect", // 2025-06
    ]);
```

to:

```ts
    expect(badges.map((b) => b.name)).toEqual([
      "5-Day AI Agents: Intensive Vibe Coding Course", // 2026-07
      "Building with the Claude API", // 2026-05
      "SnowPro Associate: Platform Certification", // 2026-03
      "SANS AWS Skills to Jobs CTF — Top 20 Regional", // 2026-03
      "Zscaler Zero Trust Certified Architect", // 2025-06
    ]);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/badges.test.ts`
Expected: FAIL, on three distinct counts:
1. `badgeGroup` returns `"cloud"` for the new name (the classifier is not widened yet).
2. The manual-badge count assertions — `toHaveLength(1 + MANUAL_NAMES.length)` at line 328 and `toHaveLength(MANUAL_NAMES.length)` inside `expectManualOnlySortedNewestFirst` — now expect 5 but `getAllBadges()` returns 4.
3. **All five tests using `expectManualOnlySortedNewestFirst`** fail their `toEqual`, because the expected array now has 5 names and the actual has 4. This is expected and is what Step 3 fixes; do not "repair" it by reverting the array.

- [ ] **Step 3: Add the badge**

In `lib/badges.ts`, append to the `manualBadges` array (after the SANS entry that ends around line 61):

```ts
  {
    name: "5-Day AI Agents: Intensive Vibe Coding Course",
    shortName: "AI Agents Intensive",
    img: "/badges/kaggle-google-ai-agents.png",
    org: "Kaggle × Google",
    date: "2026-07",
    url: "https://www.kaggle.com/certification/badges/amirabdurrahim/108",
  },
```

- [ ] **Step 4: Widen the classifier**

In `lib/badges.ts`, change line 148 from:

```ts
const DATA_PATTERN = /looker|lookml|bigquery|snow|data/i;
```

to:

```ts
const DATA_PATTERN = /looker|lookml|bigquery|snow|data|agent/i;
```

Update the adjacent doc comment on line 150 to mention the new keyword:

```ts
/** Classify a badge: data/analytics vs cloud/security. Keyword-based — review new badges and extend DATA_PATTERN as needed (e.g. Tableau/dbt/Databricks would currently land in "cloud"). "agent" is deliberate: AI-agent certifications belong with data/analytics here, not with cloud/security. */
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/badges.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify the badge renders in the right group**

Run: `npm run dev`, open `http://localhost:3000`, scroll to the Certifications section.

Confirm: the badge appears under "Data & Analytics" (not "Cloud & Security"), the image renders cleanly on the white chip in both light and dark mode, and clicking it opens the Kaggle verification page in a new tab.

- [ ] **Step 7: Commit**

```bash
git add lib/badges.ts lib/badges.test.ts
git commit -m "feat: add Kaggle x Google AI Agents certification badge

Widens DATA_PATTERN with 'agent' so it groups under Data & Analytics
rather than Cloud & Security; tests pin that the widened keyword does
not swallow the existing security badges."
```

---

## Task 8: Full verification pass

**Files:** none modified unless a check fails.

This task exists because the spec lists eleven gates and a passing unit suite covers only some of them. Work through every one and record the actual output — do not mark a gate done without running it.

- [ ] **Step 1: Build and lint**

```bash
npm run build && npm run lint && npm test
```

Expected: build succeeds; lint shows the 2 documented pre-existing errors (`interactive-headshot.tsx` react-hooks/immutability, `masonry-grid.tsx` react-hooks/set-state-in-effect) and **no new ones**; all tests pass.

- [ ] **Step 2: 320px horizontal-overflow check**

```bash
npm run start
```

In a browser at exactly 320px wide, load `/work/docdefend-agent` and run in the console:

```js
document.documentElement.scrollWidth
```

Expected: `320`. The pipeline figure and the plate are the two overflow risks. If it exceeds 320, the figure's `max-w-md` wrapper or the plate's `max-w-3xl` is the likely cause — do not fix by adding `overflow-x: hidden` to the page.

- [ ] **Step 3: Reduced-motion check**

Enable "Reduce motion" (macOS: System Settings → Accessibility → Display), reload `/work/docdefend-agent`.

Expected: the pipeline figure renders fully drawn immediately, with no animation. This should require no code — the sitewide override at the end of `globals.css` covers `.draw-stroke`. If it animates, the strokes are missing `draw-stroke` or `pathLength={100}`.

- [ ] **Step 4: Dark mode check**

Toggle dark mode on `/work/docdefend-agent`.

Expected: every figure stroke stays legible (sapphire, mauve, and peach all have `-dark` variants); the plate keeps its light styling as a deliberate mounted print rather than inverting.

- [ ] **Step 5: Outbound links return 200**

```bash
for u in https://www.docdefend.health \
         https://github.com/aabdur1/docdefend-mvp \
         https://github.com/aabdur1/healthcare-terminology-mcp \
         https://www.kaggle.com/certification/badges/amirabdurrahim/108; do
  printf "%-62s " "$u"; curl -s -o /dev/null -w "%{http_code}\n" -L --max-time 25 "$u"
done
```

Expected: `200` on all four.

- [ ] **Step 6: Number audit**

Open the spec's Verified facts table beside the rendered page. For every number on the page — 16/16, 110, 68, 2 boundaries, 6 identifier kinds, 12.2s, 75-80%, ~10%, 12 curated codes, 5 requests/minute, ~20/day, 60-80 requests — confirm a matching row exists.

Expected: every number traces. Any number without a row is either removed or verified and added to the table.

- [ ] **Step 7: De-identification audit**

Search the rendered page text for identifying detail that must not have crept back in:

```bash
grep -nEi "\bVA\b|private practice|county hospital|Dallas|after 15 years|Caruso|Outler|Abdurrahim, Dr" lib/work/case-studies.ts
```

Expected: no matches. Named public-capacity figures are permitted, but no clinician's employer, tenure, name, or pronoun.

- [ ] **Step 8: Long-title and nav check**

Load `/work`, then `/work/airline-flight-patterns`.

Expected: on the `/work` index the 03 card renders `study.title` (the full two-part title) without awkward truncation — `work-card.tsx:49` uses the full title, not `shortTitle`. On the airline page, the "next" nav label shows `DocDefend+` via `shortTitle`. Check the OG card at `/work/docdefend-agent/opengraph-image` renders without clipping.

- [ ] **Step 9: Sitemap and prev/next chain**

Load `/sitemap.xml` and confirm `/work/docdefend-agent` is present.

Walk `/work/spotify-listening` → next → `/work/airline-flight-patterns` → next → `/work/docdefend-agent`, and confirm 03 has a prev and no next.

- [ ] **Step 10: Commit any fixes and open the PR**

```bash
git add -A
git commit -m "fix: verification pass follow-ups for the DocDefend case study"
git push -u origin feat/docdefend-case-study
gh pr create --title "feat: DocDefend+ case study (/work 03) + Kaggle badge" --base main
```

If no fixes were needed, skip the commit and push as-is.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: schema extension → Task 1; figure component → Task 2; plate component and asset → Task 3; renderer wiring → Task 4; metadata, lead, metrics, all seven content sections, and links → Task 5; projects-card change → Task 6; Kaggle badge including the `DATA_PATTERN` widening → Task 7; all eleven verification gates → Task 8. The review's edits 1, 4, and 5 are carried into the Global Constraints, Task 5's prose constraints, Task 8 step 7, and Task 8 step 8 respectively.

**Type consistency.** `CaseStudyFigure` and `CaseStudyPlate` are defined in Task 1 and consumed with those exact names in Tasks 3, 4, and 5. The component/type name collision on `CaseStudyPlate` is called out in Task 3 with the alias import that resolves it. `figure.kind` is `'grounding-pipeline'` in the type (Task 1), the registry key (Task 4), and the data (Task 5). Plate dimensions are 1192×640 in the crop command (Task 3), the test fixture (Task 3), and the data entry (Task 5).

**Assumptions verified against source before publishing this plan** (so the implementer inherits no guesses):

| Assumption | Verified |
|---|---|
| `.reg-mark` supplies `position: absolute` and `border-color` but **not** border width | `globals.css:593-600` — the plan's component therefore carries `border-t`/`border-l` etc., matching `interactive-headshot.tsx:162-165` |
| `.is-drawn .draw-stroke` descendant variant exists, so `is-drawn` on a wrapper drives child strokes | `globals.css:555` |
| Reduced-motion override covers `.draw-stroke`, `.draw-stroke.is-drawn`, and `.is-drawn .draw-stroke` | `globals.css:629-631` — the figure needs no reduced-motion handling of its own |
| `useScrollReveal()` returns `[RefObject<HTMLElement \| null>, boolean]` | `lib/hooks.ts:74-96` |
| Colour tokens `ink`, `ink-subtle`, `ink-faint`, `night-text`, `night-muted`, `night-border` all exist, so `fill-*`/`stroke-*` utilities resolve | `globals.css:63-100` |
| `stroke-ink-faint dark:stroke-night-border` is an established pattern | `projects.tsx:156` |
| sharp is available at 0.34.5 | `node -e "require('sharp')"` |
| Plate crop coordinates capture the intended frame | crop executed and inspected before writing this plan |

**Known softness.** None outstanding. The one previously-flagged item (the `.reg-mark` treatment) was resolved by reading `globals.css` and the reference component rather than deferring it to the implementer.
