# Job-Search Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add recruiter-conversion features to amirabdurrahim.com — hero CTA + positioning blurb, featured Theli card, provenance tags, grouped certifications, Learn teaser section, and a linked resume PDF.

**Architecture:** All changes follow existing site patterns: client components with `useScrollReveal`, shared `ACCENT_STYLES`, `SectionDivider`/`SectionHeader`, inline-style entry animations with `animation` shorthand (never separate `animationDelay`). Two new components (`featured-project.tsx`, `learn-teaser.tsx`); the rest are edits to existing files.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4 (CSS-first tokens — rosewater tokens already exist in `globals.css`), next/image, sharp (already a dependency) for the screenshot asset.

**Verification model:** This repo has no unit-test framework. Each task verifies via `npm run build` (must succeed) and a dev-server visual check; Task 9 is the full visual/a11y pass. Known pre-existing lint errors (interactive-headshot.tsx, masonry-grid.tsx:117) are NOT regressions — any other lint error is.

**Spec:** `docs/superpowers/specs/2026-06-10-job-search-revamp-design.md`

---

### Task 1: Rosewater accent styles

**Files:**
- Modify: `lib/styles.ts` (add rosewater to `ACCENT_STYLES`)
- Modify: `components/projects.tsx:8-12` (add rosewater to `STRIPE_STYLES`)

- [ ] **Step 1: Add rosewater entry to ACCENT_STYLES**

In `lib/styles.ts`, after the `lavender` entry (before the closing `} as const;`):

```ts
  rosewater: {
    bg: "bg-rosewater/10 dark:bg-rosewater-dark/12",
    border: "border-rosewater/25 dark:border-rosewater-dark/25",
    hoverBorder: "hover:border-rosewater/50 dark:hover:border-rosewater-dark/50",
    dot: "bg-rosewater dark:bg-rosewater-dark",
    text: "text-ink dark:text-night-text/80",
  },
```

(`--color-rosewater: #dc8a78` and `--color-rosewater-dark: #f5e0dc` already exist in `app/globals.css` — no token changes needed.)

- [ ] **Step 2: Add rosewater stripe to STRIPE_STYLES**

In `components/projects.tsx`, `STRIPE_STYLES` becomes:

```ts
const STRIPE_STYLES = {
  sapphire: "border-t-sapphire dark:border-t-sapphire-dark",
  mauve: "border-t-mauve dark:border-t-mauve-dark",
  lavender: "border-t-lavender dark:border-t-lavender-dark",
  rosewater: "border-t-rosewater dark:border-t-rosewater-dark",
} as const;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds (the new classes are unused so far; this catches token typos).

- [ ] **Step 4: Commit**

```bash
git add lib/styles.ts components/projects.tsx
git commit -m "feat: add rosewater accent to shared style maps"
```

---

### Task 2: Hero blurb + CTA pair

**Files:**
- Modify: `components/hero.tsx`

- [ ] **Step 1: Add blurb + CTA scroll rates**

In `SCROLL_RATES` (hero.tsx:56-65), replace:

```ts
  tagline: 0.12,
  social: 0.06,
```

with:

```ts
  tagline: 0.12,
  blurb: 0.1,
  cta: 0.08,
  social: 0.06,
```

- [ ] **Step 2: Add refs and parallax wiring**

After `const socialRef = useRef<HTMLDivElement>(null);` (hero.tsx:78) add:

```ts
  const blurbRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
```

In `updateParallax`, after `move(taglineRef.current, SCROLL_RATES.tagline);` add:

```ts
    move(blurbRef.current, SCROLL_RATES.blurb);
    move(ctaRef.current, SCROLL_RATES.cta);
```

In the `useEffect` parallax-attach block, the `refs` array becomes:

```ts
      const refs = [labelRef, headshotRef, nameRef, ruleRef, taglineRef, blurbRef, ctaRef, socialRef, badgesRef, scrollIndRef];
```

- [ ] **Step 3: Insert blurb and CTA markup**

In the JSX, directly after the tagline `<p>` (closes at hero.tsx:219) and before the social links `<div ref={socialRef}>`, insert:

```tsx
            {/* Positioning blurb */}
            <p
              ref={blurbRef}
              className="text-sm sm:text-base mt-5 max-w-lg font-[family-name:var(--font-body)]
                text-ink-subtle dark:text-night-muted leading-relaxed will-change-transform"
              style={{
                opacity: 0,
                ...(mounted ? { animation: "fade-in-up 0.6s ease-out 0.95s forwards" } : {}),
              }}
            >
              Healthcare data analyst with 2+ years of Epic EHR experience — building
              clinical ML, BI, and documentation tools. MS in MIS at UIC, graduating Fall &rsquo;26.
            </p>

            {/* CTA pair */}
            <div ref={ctaRef} className="flex flex-wrap gap-3 items-center mt-7 will-change-transform">
              <a
                href="mailto:amirabdurrahim@gmail.com"
                className="btn-lift inline-flex items-center justify-center rounded-full px-6 py-3
                  bg-mauve dark:bg-mauve-dark text-cream dark:text-night
                  text-[13px] tracking-wide font-[family-name:var(--font-badge)] font-medium
                  hover:shadow-card"
                style={{
                  opacity: 0,
                  ...(mounted ? { animation: "fade-in-up 0.5s ease-out 1.1s forwards" } : {}),
                }}
              >
                Get in touch
              </a>
              <a
                href="/Amir_Abdur-Rahim_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View resume (opens in new tab)"
                className="btn-lift inline-flex items-center justify-center rounded-full px-6 py-3
                  border border-ink/20 dark:border-night-border
                  text-ink dark:text-night-text
                  text-[13px] tracking-wide font-[family-name:var(--font-badge)]
                  hover:border-sapphire/50 dark:hover:border-sapphire-dark/50 hover:shadow-card"
                style={{
                  opacity: 0,
                  ...(mounted ? { animation: "fade-in-up 0.5s ease-out 1.2s forwards" } : {}),
                }}
              >
                View resume
              </a>
            </div>
```

- [ ] **Step 4: Re-space downstream stagger delays**

Social icons (currently `1.1s`, `1.25s`, `1.4s` at hero.tsx:234, 252, 268) become `1.35s`, `1.45s`, `1.55s`. Badge delays (hero.tsx:296) change from `${1600 + i * 100}ms` to `${1700 + i * 100}ms`. The hero.tsx:122 comment about the last-badge time updates from `~2.2s` to `~2.0s` (last badge = 1700 + 300 = 2000ms; the 2500ms parallax timer still clears it). The social row's `mt-8` (hero.tsx:222) becomes `mt-6`.

- [ ] **Step 5: Verify in dev**

Run: `npm run dev`, open http://localhost:3000. Expect: tagline → blurb → CTA buttons → social icons → badges animate in that order; buttons lift on hover; mauve button text readable in both themes; layout intact at 320px width (buttons wrap, no overflow). The resume link 404s — expected until Task 8.

- [ ] **Step 6: Commit**

```bash
git add components/hero.tsx
git commit -m "feat: hero positioning blurb + Get in touch / View resume CTAs"
```

---

### Task 3: Theli screenshot asset

**Files:**
- Create: `public/theli/home.png` (from `~/repos/clearlabel/views/home.png`)

- [ ] **Step 1: Optimize the screenshot into public/theli/**

```bash
mkdir -p public/theli
node -e "
const sharp = require('sharp');
sharp('/Users/amirabdurrahim/repos/clearlabel/views/home.png')
  .resize({ width: 640, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile('public/theli/home.png')
  .then(info => console.log(JSON.stringify(info)));
"
```

Expected: JSON output with `width: 640` and a `height` value (iPhone-portrait ratio, roughly 1300–1400). **Record the exact printed width/height — Task 4 uses them as `IMG_WIDTH`/`IMG_HEIGHT`.** Resulting file should be well under 300KB; if larger, re-run with `.png({ quality: 80, palette: true })`.

- [ ] **Step 2: Commit**

```bash
git add public/theli/home.png
git commit -m "feat: add optimized Theli home screenshot asset"
```

---

### Task 4: FeaturedProject card (Theli marquee)

**Files:**
- Create: `components/featured-project.tsx`
- Modify: `components/projects.tsx` (render above grid, shift grid delays)

- [ ] **Step 1: Create components/featured-project.tsx**

Full file (replace `IMG_WIDTH`/`IMG_HEIGHT` with the values printed in Task 3 Step 1):

```tsx
"use client";

import Image from "next/image";
import { ACCENT_STYLES } from "@/lib/styles";

const IMG_WIDTH = 640; // from Task 3 sharp output
const IMG_HEIGHT = 1386; // from Task 3 sharp output

const pills = ["Swift 6", "SwiftUI", "Vision OCR", "HealthKit"];

export function FeaturedProject({ visible }: { visible: boolean }) {
  const s = ACCENT_STYLES.rosewater;
  const peach = ACCENT_STYLES.peach;

  return (
    <a
      href="https://theli.app"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Theli — privacy-first iOS nutrition scanner, coming soon to the App Store (opens in new tab)"
      className={`group relative grid lg:grid-cols-[2fr_1fr] gap-6 lg:gap-10 items-center
        p-6 sm:p-8 mb-4 sm:mb-6 rounded-2xl
        border-t-[3px] border-t-rosewater dark:border-t-rosewater-dark
        bg-cream/80 dark:bg-night/60
        border border-cream-border/60 dark:border-night-border/60
        ${s.hoverBorder}
        hover:-translate-y-1 hover:shadow-card`}
      style={{
        opacity: 0,
        transition:
          "transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring), border-color 300ms ease",
        ...(visible
          ? { animation: "fade-in-up 0.5s ease-out 200ms forwards" }
          : {}),
      }}
    >
      {/* Text column */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h3 className="text-2xl font-[family-name:var(--font-display)] text-ink dark:text-night-text leading-tight">
            Theli
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1
              ${peach.bg} border ${peach.border}
              text-[12px] tracking-wide font-[family-name:var(--font-badge)] ${peach.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${peach.dot} shrink-0`} />
            Coming soon — App Store
          </span>
        </div>

        <p className="text-sm font-[family-name:var(--font-badge)] italic text-ink-subtle dark:text-night-muted mb-3">
          Privacy-first iOS Nutrition Scanner — independent product
        </p>

        <p className="text-sm sm:text-base font-[family-name:var(--font-body)] text-ink dark:text-night-text/70 leading-relaxed mb-4">
          Barcode lookup + on-device label OCR, Apple Health sync. No accounts, no
          ads, no tracking.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
                ${s.bg} border ${s.border}
                text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)] ${s.text}`}
            >
              <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Screenshot column — stacks above text on mobile */}
      <div className="order-first lg:order-last mx-auto w-36 sm:w-44 lg:w-full lg:max-w-[200px]">
        <Image
          src="/theli/home.png"
          alt="Theli home screen showing a day's logged meals"
          width={IMG_WIDTH}
          height={IMG_HEIGHT}
          sizes="(max-width: 640px) 144px, 200px"
          className="w-full h-auto rounded-2xl border border-cream-border/60 dark:border-night-border/60
            group-hover:scale-[1.02] transition-transform duration-300"
        />
      </div>

      {/* External-link arrow */}
      <div
        className="absolute top-4 right-4 text-ink-faint/40 dark:text-night-muted/40
        group-hover:text-ink-muted dark:group-hover:text-night-muted
        transition-colors duration-200"
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path
            fillRule="evenodd"
            d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Render it in projects.tsx**

Add import at top of `components/projects.tsx`:

```ts
import { FeaturedProject } from "@/components/featured-project";
```

Between `<SectionHeader ... />` and the grid `<div className="grid ...">` insert:

```tsx
        <FeaturedProject visible={visible} />
```

Shift the grid-card animation delay (projects.tsx:162) from `${200 + i * 100}ms` to `${300 + i * 100}ms` so the marquee leads.

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`. On the homepage Projects section expect: full-width rosewater-striped Theli card above the grid; screenshot right at ≥1024px, stacked above text below; peach "Coming soon" pill; whole card links to theli.app in a new tab; card animates in before the grid cards. Check both themes and 320px.

- [ ] **Step 4: Commit**

```bash
git add components/featured-project.tsx components/projects.tsx
git commit -m "feat: featured Theli marquee card in Projects section"
```

---

### Task 5: Provenance tags on project cards

**Files:**
- Modify: `components/projects.tsx`

- [ ] **Step 1: Add provenance to project data**

Each entry in the `projects` array gains a `provenance` field:

| name | provenance |
|---|---|
| Parkinson's Voice Screening | `"Graduate coursework · UIC MS MIS"` |
| WIEIAD Risk Scoring | `"Graduate coursework · UIC MS MIS"` |
| DocDefend+ | `"Graduate coursework · UIC MS MIS"` |
| StudentPM | `"Graduate coursework · UIC MS MIS"` |
| LightERP | `"Graduate coursework · UIC MS MIS"` |
| CTF & Security Labs | `"SANS competition"` |

Example for the first entry:

```ts
  {
    name: "Parkinson's Voice Screening",
    subtitle: "Clinical ML from Acoustic Features",
    provenance: "Graduate coursework · UIC MS MIS",
    description: ...,  // unchanged
    ...
  },
```

- [ ] **Step 2: Render the tag**

In the card JSX, change the subtitle `<p>` margin from `mb-3` to `mb-1`, and insert directly after it:

```tsx
                <p
                  className="text-[12px] font-[family-name:var(--font-mono)] tracking-wide
                    text-ink-subtle dark:text-night-muted mb-3"
                >
                  {project.provenance}
                </p>
```

(All six projects have a provenance value, so no conditional is needed; keep the field required in the array literal.)

- [ ] **Step 3: Verify in dev**

Expect: small mono tag under each card subtitle, 12px, AA-contrast `text-ink-subtle`. Cards still align.

- [ ] **Step 4: Commit**

```bash
git add components/projects.tsx
git commit -m "feat: provenance tags on project cards"
```

---

### Task 6: Certifications grouping + image normalization

**Files:**
- Modify: `lib/badges.ts` (group classifier)
- Modify: `components/certifications.tsx` (two grouped grids + image chip)

- [ ] **Step 1: Add the group classifier to lib/badges.ts**

Append at the end of the file:

```ts
/** Badge grouping for the Certifications section */
export type BadgeGroup = "data" | "cloud";

const DATA_PATTERN = /looker|lookml|bigquery|snow|data/i;

/** Classify a badge: data/analytics vs cloud/security. Future Credly badges self-sort. */
export function badgeGroup(badge: Badge): BadgeGroup {
  return DATA_PATTERN.test(badge.name) ? "data" : "cloud";
}
```

- [ ] **Step 2: Split rendering into two grouped subsections**

In `components/certifications.tsx`:

Add `badgeGroup` to the type import:

```ts
import { badgeGroup, type Badge } from "@/lib/badges";
```

Inside the component, before `return`, partition (badges arrive pre-sorted newest-first, so each group stays sorted):

```ts
  const groups = [
    { label: "Data & Analytics", dot: "bg-sapphire dark:bg-sapphire-dark", items: badges.filter((b) => badgeGroup(b) === "data") },
    { label: "Cloud & Security", dot: "bg-lavender dark:bg-lavender-dark", items: badges.filter((b) => badgeGroup(b) === "cloud") },
  ];
```

Replace the single grid `<div className="grid ...">…</div>` with a map over groups. The inner card markup is identical to the current one except for the image wrapper (next step) and the animation delay using the per-group index:

```tsx
        {groups.map((group, g) => (
          <div key={group.label} className={g === 0 ? "" : "mt-12"}>
            <p
              className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase
                font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted mb-5"
              style={{
                opacity: 0,
                ...(visible ? { animation: `fade-in 0.5s ease-out ${100 + g * 80}ms forwards` } : {}),
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${group.dot} shrink-0`} aria-hidden="true" />
              {group.label}
            </p>
            <div className="grid grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {group.items.map((badge, i) => (
                /* the existing <a> card from certifications.tsx:37-79, verbatim, with TWO changes:
                   1. animation delay becomes `${200 + g * 100 + i * 80}ms`
                   2. the image wrapper is replaced per Step 3 below */
              ))}
            </div>
          </div>
        ))}
```

**Important:** before finalizing the label markup, open `components/skills.tsx` and match its category-label classes exactly (the pattern above mirrors the screenshots; skills.tsx is the source of truth for this style).

- [ ] **Step 3: Normalize badge image presentation**

Replace the image wrapper (currently `relative w-20 h-20 sm:w-24 sm:h-24 mb-3 group-hover:scale-105 transition-transform duration-300`) with a consistent chip:

```tsx
              <div
                className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-3 p-2
                  rounded-xl bg-white/90 dark:bg-cream/95
                  border border-cream-border/60 dark:border-night-border/40
                  group-hover:scale-105 transition-transform duration-300"
              >
                <Image
                  src={badge.img}
                  alt={badge.name}
                  width={96}
                  height={96}
                  sizes="(max-width: 640px) 80px, 96px"
                  className="w-full h-full object-contain"
                />
              </div>
```

- [ ] **Step 4: Verify in dev**

Expect: two labeled subsections; SnowPro/BigQuery/Looker/LookML/Data Engineering badges under "Data & Analytics", AWS/Zscaler/SANS/Claude API/GenAI under "Cloud & Security"; every badge image on a uniform white chip in both themes; certificate-screenshot images now legible. If any badge lands in the wrong group, adjust `DATA_PATTERN` (or add a manual override map keyed on `badge.name`) rather than reordering data.

- [ ] **Step 5: Commit**

```bash
git add lib/badges.ts components/certifications.tsx
git commit -m "feat: group certifications into Data & Analytics / Cloud & Security with normalized badge chips"
```

---

### Task 7: Learn teaser section ("06 / Learning in Public")

**Files:**
- Create: `components/learn-teaser.tsx`
- Modify: `app/page.tsx` (render after Education)

- [ ] **Step 1: Create components/learn-teaser.tsx**

Full file:

```tsx
"use client";

import Link from "next/link";
import { ARTIFACTS } from "@/lib/learn/artifacts";
import { useScrollReveal } from "@/lib/hooks";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

const TEASER_SLUGS = ["neural-networks", "pca", "shap"];

const teaserArtifacts = TEASER_SLUGS.map(
  (slug) => ARTIFACTS.find((a) => a.slug === slug)!
);

export function LearnTeaser() {
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="section-06"
      className="relative py-20 sm:py-28 bg-cream-dark/50 dark:bg-night-card/40"
    >
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader number="06" label="Learn" title="Learning in Public" visible={visible} />

        <p
          className="text-sm sm:text-base font-[family-name:var(--font-body)]
            text-ink-subtle dark:text-night-muted leading-relaxed mb-8 max-w-2xl"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in-up 0.5s ease-out 150ms forwards" } : {}),
          }}
        >
          Interactive ML explainers, built while studying for my data mining coursework.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {teaserArtifacts.map((artifact, i) => (
            <Link
              key={artifact.slug}
              href={`/learn/${artifact.slug}`}
              className="group flex flex-col p-5 rounded-2xl
                bg-cream/80 dark:bg-night/60
                border border-cream-border/60 dark:border-night-border/60
                hover:border-mauve/50 dark:hover:border-mauve-dark/50
                hover:-translate-y-1 hover:shadow-card"
              style={{
                opacity: 0,
                transition:
                  "transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring), border-color 300ms ease",
                ...(visible
                  ? { animation: `fade-in-up 0.5s ease-out ${250 + i * 100}ms forwards` }
                  : {}),
              }}
            >
              <span className="text-xs font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark mb-2">
                {artifact.number}/
              </span>
              <h3 className="text-lg font-[family-name:var(--font-display)] text-ink dark:text-night-text leading-tight mb-2">
                {artifact.title}
              </h3>
              <p className="text-[13px] font-[family-name:var(--font-body)] text-ink-subtle dark:text-night-muted leading-relaxed mb-3 flex-1">
                {artifact.subtopics.slice(0, 4).join(" · ")}
              </p>
              <span className="text-xs font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted tracking-wide">
                {artifact.sectionCount} sections · interactive
              </span>
            </Link>
          ))}
        </div>

        <div
          className="text-center mt-10"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in 0.6s ease-out 700ms forwards" } : {}),
          }}
        >
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 py-3 text-sm font-[family-name:var(--font-body)]
              text-ink-subtle dark:text-night-muted
              hover:text-ink dark:hover:text-night-text
              transition-colors duration-200"
          >
            Explore all {ARTIFACTS.length}
            <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Render in app/page.tsx**

Add import:

```ts
import { LearnTeaser } from "@/components/learn-teaser";
```

In the JSX, after `<Education />`:

```tsx
      <Education />
      <LearnTeaser />
```

- [ ] **Step 3: Verify in dev**

Expect: tinted "06 / Learning in Public" section after Education; three cards (Neural Networks, PCA, SHAP) linking to their artifact pages; "Explore all 7 →" to /learn; scroll-reveal works; alternating background pattern preserved (Education transparent → 06 tinted → footer).

- [ ] **Step 4: Commit**

```bash
git add components/learn-teaser.tsx app/page.tsx
git commit -m "feat: Learning in Public teaser section on homepage"
```

---

### Task 8: Resume content pass + PDF export

**Files:**
- Modify: `/Users/amirabdurrahim/job_search/resume.md` (with Amir — incremental edits only)
- Create: `/Users/amirabdurrahim/job_search/scripts/export-resume.mjs`
- Create: `public/Amir_Abdur-Rahim_Resume.pdf`

**⚠ Collaborative task** — the content pass needs Amir's sign-off; do not bulk-rewrite `resume.md` (job_search convention: incremental `Edit` only, quantified bullets, `[TODO: metric]` rather than invented numbers, no emojis).

- [ ] **Step 1: Content pass on resume.md (with Amir)**

Read `/Users/amirabdurrahim/job_search/resume.md`. Propose incremental edits covering: Building with the Claude API cert (2026-05), SnowPro Associate (2026-03), SANS CTF Top 20 (2026-03), Theli (one line, "coming soon to the App Store"), and current portfolio projects. Apply only edits Amir approves.

- [ ] **Step 2: Create the export script**

`/Users/amirabdurrahim/job_search/scripts/export-resume.mjs`:

```js
#!/usr/bin/env node
/**
 * resume.md → Amir_Abdur-Rahim_Resume.pdf
 * Usage: node scripts/export-resume.mjs
 * Requires: npx marked; Google Chrome installed (headless print-to-pdf).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(resolve(root, "resume.md"), "utf8");
const body = execSync("npx --yes marked --gfm", { input: md, encoding: "utf8" });

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: letter; margin: 0.55in 0.6in; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.45 Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; }
  h1 { font-size: 19pt; margin: 0 0 2pt; letter-spacing: 0.5px; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1.5px;
       border-bottom: 1px solid #999; padding-bottom: 2pt; margin: 12pt 0 6pt; }
  h3 { font-size: 10.5pt; margin: 8pt 0 1pt; }
  p, ul { margin: 2pt 0; }
  ul { padding-left: 16pt; }
  li { margin: 1.5pt 0; }
  a { color: #1a1a1a; text-decoration: none; }
  hr { border: none; border-top: 1px solid #ccc; margin: 8pt 0; }
</style></head><body>${body}</body></html>`;

const tmp = resolve(root, ".resume-tmp.html");
writeFileSync(tmp, html);
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execSync(
  `"${chrome}" --headless --disable-gpu --no-pdf-header-footer ` +
  `--print-to-pdf="${resolve(root, "Amir_Abdur-Rahim_Resume.pdf")}" "${tmp}"`,
  { stdio: "inherit" }
);
rmSync(tmp);
console.log("Wrote", resolve(root, "Amir_Abdur-Rahim_Resume.pdf"));
```

(If Google Chrome isn't at that path, substitute any Chromium binary, e.g. from `npx playwright install chromium` → `~/Library/Caches/ms-playwright/chromium-*/chrome-mac/...`.)

- [ ] **Step 3: Export and review**

```bash
cd /Users/amirabdurrahim/job_search && node scripts/export-resume.mjs
open Amir_Abdur-Rahim_Resume.pdf
```

Expected: single-page (or intentionally two-page) clean PDF. Amir reviews before it ships.

- [ ] **Step 4: Copy into the site and commit**

```bash
cp /Users/amirabdurrahim/job_search/Amir_Abdur-Rahim_Resume.pdf /Users/amirabdurrahim/repos/amir-site/public/
cd /Users/amirabdurrahim/repos/amir-site
git add public/Amir_Abdur-Rahim_Resume.pdf
git commit -m "feat: add resume PDF served at /Amir_Abdur-Rahim_Resume.pdf"
```

(The hero CTA from Task 2 now resolves.)

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Build + lint**

```bash
npm run build && npm run lint
```

Expected: build succeeds; lint shows ONLY the 2 known pre-existing errors (interactive-headshot.tsx react-hooks/immutability, masonry-grid.tsx:117 set-state-in-effect).

- [ ] **Step 2: Visual pass (Playwright MCP or manual)**

With `npm run dev` running, check http://localhost:3000 at 1440×900, 390×844, and 320×680, in light AND dark mode:
- Hero: blurb readable, CTA pair wraps cleanly at 320px, mauve button text contrast OK in both themes.
- Projects: Theli marquee renders (screenshot right ≥1024px / stacked below), provenance tags on all six cards.
- Certifications: two labeled groups, uniform badge chips.
- Learn teaser: three cards, links work (`/learn/neural-networks`, `/learn/pca`, `/learn/shap`, `/learn`).
- `/Amir_Abdur-Rahim_Resume.pdf` loads.

- [ ] **Step 3: Accessibility + motion spot checks**

- Keyboard: Tab reaches both hero CTAs, the Theli card, all three teaser cards, and the "Explore all" link; mauve focus ring visible on each.
- Reduced motion (DevTools → Rendering → emulate `prefers-reduced-motion`): hero blurb/CTAs and new sections render immediately with no animation start state. (Existing pattern handles this — `mounted`/`visible` inline animations are killed by the global media query; verify nothing stays `opacity: 0`.)
- Screen-reader labels: CTA "View resume (opens in new tab)", Theli card aria-label, decorative SVGs `aria-hidden`.

- [ ] **Step 4: Fix anything found, commit fixes**

```bash
git add -A && git commit -m "fix: revamp polish from verification pass"
```

(Skip if nothing found.)

---

### Task 10: Update CLAUDE.md + wrap up

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

- "Client components marked explicitly" list: add `featured-project`, `learn-teaser`.
- Key Patterns: add bullets for (a) hero CTA pair + blurb (parallax rates blurb 0.1/cta 0.08, stagger order), (b) FeaturedProject marquee card (rosewater accent, data-only launch swap: URL + pill text), (c) provenance tags on project cards, (d) certifications grouping via `badgeGroup()` keyword classifier in `lib/badges.ts` + white-chip image normalization, (e) Learn teaser section 06 sourcing `TEASER_SLUGS` from `lib/learn/artifacts.ts`.
- Multi-accent system: note rosewater now also used for the featured Theli card; `ACCENT_STYLES` gained `rosewater`.
- Numbered editorial sections: now `01/`–`06/`.
- File Structure: add `components/featured-project.tsx`, `components/learn-teaser.tsx`, `public/theli/`, `public/Amir_Abdur-Rahim_Resume.pdf`.
- Photos/landing description at top: mention hero CTA + resume.

- [ ] **Step 2: Final commit + push**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for job-search revamp (hero CTA, featured Theli, certs groups, learn teaser)"
git push
```

Netlify auto-deploys from the GitHub repo — confirm the deploy succeeds and spot-check amirabdurrahim.com.
