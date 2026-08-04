# Projects Bento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage "Things I've Built" section as a three-tier bento — one featured Spotify card with a dashboard image plate, an emphasized DocDefend+/Parkinson's pair with drawn SVG motifs, and a compact 3-col standard tier of six.

**Architecture:** All in `components/projects.tsx` — the `projects` array gains a `tier` field and becomes DOM/mobile order; the render splits into `FeaturedCard`, an emphasized 2-up, and a `lg:grid-cols-3` standard grid, all sharing the existing card chrome and one flat-index entry-stagger. The plate image is a pre-cropped, sharp-optimized static asset in `public/work/`. Motifs use the learn-card `draw-stroke`/`spark-bar` + `is-drawn` mechanism (both `.is-drawn` descendant variants verified present in globals.css at lines ~555/567 with reduced-motion overrides at ~631/636).

**Tech Stack:** Next.js 16, TypeScript, Tailwind 4, next/image, sharp (already a dependency — used by `scripts/add-photo.mjs`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-04-projects-bento-design.md` — authoritative for tier assignments, WIEIAD replacement text, and the DocDefend URL fix.

## Global Constraints

- Branch: `feat/projects-bento` (exists; spec committed on it).
- Restrained editorial styling: prominence via size/image only — no badges, no new colors, existing palette classes only (`stroke-X dark:stroke-X-dark` etc.).
- Card content untouched EXCEPT the WIEIAD description and DocDefend+ url (exact values in Task 2).
- Dashed SVG strokes NEVER get `draw-stroke` (it would destroy the dash pattern — CLAUDE.md learn-card gotcha).
- Minimum readable text 12px; decorative SVGs `aria-hidden="true" focusable="false"`.
- Known pre-existing lint errors (not failures): `interactive-headshot.tsx`, `masonry-grid.tsx`.
- Commit messages end with: Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

---

### Task 1: Produce the featured plate asset

**Files:**
- Create: `public/work/spotify-plate.png` (or `.jpg` — see Step 2)
- Source (gitignored, already present): `.superpowers/assets/spotify-plate-source.png` (1792×1784)

**Interfaces:**
- Produces: the committed asset path + final pixel dimensions. Task 2's `FeaturedCard` uses `/work/spotify-plate.png` with `width={1600} height={1325}` — if Step 2 picks JPEG or the height differs, Task 2 must use the actual values from this task's report.

- [ ] **Step 1: Verify sharp is available**

Run: `node -e "console.log(require('sharp/package.json').version)"`
Expected: prints a version. (sharp backs `scripts/add-photo.mjs`; do NOT install anything if missing — stop and report BLOCKED.)

- [ ] **Step 2: Crop (KPI row down), resize, compress both ways**

```bash
mkdir -p public/work
node -e "
const sharp = require('sharp'); const fs = require('fs');
(async () => {
  const base = sharp('.superpowers/assets/spotify-plate-source.png')
    .extract({ left: 0, top: 300, width: 1792, height: 1484 })
    .resize({ width: 1600 });
  await base.clone().png({ compressionLevel: 9, palette: true }).toFile('/tmp/plate.png');
  await base.clone().jpeg({ quality: 85, mozjpeg: true }).toFile('/tmp/plate.jpg');
  const p = fs.statSync('/tmp/plate.png').size, j = fs.statSync('/tmp/plate.jpg').size;
  const meta = await sharp('/tmp/plate.png').metadata();
  console.log('png', p, 'jpg', j, 'dims', meta.width + 'x' + meta.height);
})()"
```

Expected: dims 1600×1325. Pick PNG if ≤ 250KB (flat UI + text compresses well and stays crisp); otherwise JPEG. Copy the winner:
`cp /tmp/plate.png public/work/spotify-plate.png` (or the .jpg equivalents).

- [ ] **Step 3: Eyeball the crop**

Run: `open public/work/spotify-plate.png` — the image must START at the KPI tiles (HOURS / MUSIC STREAMS / ARTISTS / TRACKS row); NO part of the "MY SPOTIFY LISTENING" title text may be visible at the top. If title remnants show, raise `top:` (310, 320…) and re-run Step 2. Record the final `top` used.

- [ ] **Step 4: Commit**

```bash
git add public/work/spotify-plate.png
git commit -m "feat: add Spotify dashboard plate asset for the featured project card"
```

---

### Task 2: Bento rewrite of projects.tsx (+ drafts URL fix)

**Files:**
- Modify: `components/projects.tsx` (full rewrite of the array and the component body; imports/STRIPE_STYLES kept)
- Modify: `lib/work/unpublished-drafts.ts:215` (one string)

**Interfaces:**
- Consumes: `/work/spotify-plate.png` 1600×1325 from Task 1 (adjust name/height if Task 1's report differs).
- Produces: the shipped bento. Nothing downstream consumes new interfaces.

- [ ] **Step 1: Rewrite the `projects` array**

Order and tiers (content verbatim from the current file EXCEPT the two marked changes):

1. **Spotify** — `tier: "featured"`, all fields as today.
2. **DocDefend+** — `tier: "emphasized"`, `url` CHANGED to `"https://www.docdefend.health"` (verified: the old vercel URL 308-redirects there). All other fields as today.
3. **Parkinson's** — `tier: "emphasized"`, fields as today.
4. **WIEIAD** — `tier: "standard"`, description REPLACED verbatim with:

```
Multimodal analysis of 1,100+ 'What I Eat in a Day' TikToks — Whisper, OCR, and CLIP features scored across five ED risk signals; coded-hashtag videos showed 2× the mainstream signal prevalence. Gemini whole-video analysis of 467 video-days against HEI-2020.
```

5. **Theli** — `tier: "standard"`, fields as today.
6. **LightERP** · 7. **CTF & Security Labs** · 8. **StudentPM** · 9. **US Airline Flight Patterns** — `tier: "standard"`, fields as today.

Every entry keeps its `as const` accent. Add `tier` as the last field of each object.

- [ ] **Step 2: Fix the drafts link**

In `lib/work/unpublished-drafts.ts`, replace `href: 'https://docdefend.vercel.app',` with `href: 'https://www.docdefend.health',` (comment untouched).

- [ ] **Step 3: Rewrite the component body**

Replace everything from `export function Projects()` down (and add the two imports + helpers above it). Complete code:

```tsx
import Image from "next/image";
```
(added to the existing imports at the top of the file)

Helpers and motifs, inserted between the `projects` array and `Projects()`:

```tsx
type Project = (typeof projects)[number];

const entryStyle = (visible: boolean, i: number): React.CSSProperties => ({
  opacity: 0,
  transition:
    "transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring), border-color 300ms ease",
  ...(visible
    ? { animation: `fade-in-up 0.5s ease-out ${300 + i * 100}ms forwards` }
    : {}),
});

const frameClass = (accent: keyof typeof STRIPE_STYLES, layout: string) =>
  `group relative ${layout} rounded-2xl
   border-t-[3px] ${STRIPE_STYLES[accent]}
   bg-cream/80 dark:bg-night/60
   border border-cream-border/60 dark:border-night-border/60
   ${ACCENT_STYLES[accent].hoverBorder}
   hover:-translate-y-1 hover:shadow-card`;

// Clinical note + verification tick + defensibility score bars.
function DocDefendMotif() {
  return (
    <svg viewBox="0 0 260 84" className="w-full h-auto max-h-24" aria-hidden="true" focusable="false">
      <rect x="12" y="8" width="92" height="68" rx="4" fill="none" strokeWidth="1.5"
        className="stroke-sapphire dark:stroke-sapphire-dark draw-stroke" pathLength={100} />
      <g className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.5" strokeLinecap="round">
        <line x1="22" y1="24" x2="94" y2="24" className="draw-stroke" pathLength={100} />
        <line x1="22" y1="36" x2="86" y2="36" className="draw-stroke" pathLength={100} />
        <line x1="22" y1="48" x2="94" y2="48" className="draw-stroke" pathLength={100} />
        <line x1="22" y1="60" x2="70" y2="60" className="draw-stroke" pathLength={100} />
      </g>
      <path d="M120 44 L134 58 L160 24" fill="none" strokeWidth="2.5" strokeLinecap="round"
        strokeLinejoin="round" className="stroke-peach dark:stroke-peach-dark draw-stroke" pathLength={100} />
      <g className="fill-sapphire dark:fill-sapphire-dark">
        <rect x="184" y="52" width="10" height="16" rx="1" className="spark-bar" style={{ transformBox: "fill-box" }} />
        <rect x="200" y="40" width="10" height="28" rx="1" className="spark-bar" style={{ transformBox: "fill-box" }} />
        <rect x="216" y="28" width="10" height="40" rx="1" className="spark-bar" style={{ transformBox: "fill-box" }} />
      </g>
      <line x1="180" y1="68" x2="240" y2="68" strokeWidth="1" className="stroke-ink-faint dark:stroke-night-border" />
    </svg>
  );
}

// Sustained-vowel waveform flowing into an ROC curve with an operating point.
// The chance diagonal is dashed and therefore deliberately NOT draw-stroke.
function ParkinsonsMotif() {
  return (
    <svg viewBox="0 0 260 84" className="w-full h-auto max-h-24" aria-hidden="true" focusable="false">
      <path d="M10 42 Q16 18 22 42 T34 42 T46 42 T58 42 T70 42 T82 42 T94 42 T106 42"
        fill="none" strokeWidth="1.5" className="stroke-mauve dark:stroke-mauve-dark draw-stroke" pathLength={100} />
      <path d="M140 10 L140 68 L244 68" fill="none" strokeWidth="1"
        className="stroke-ink-faint dark:stroke-night-border draw-stroke" pathLength={100} />
      <line x1="140" y1="68" x2="244" y2="10" strokeWidth="1" strokeDasharray="4 4"
        className="stroke-ink-faint dark:stroke-night-border" />
      <path d="M140 68 C150 30 170 16 244 12" fill="none" strokeWidth="2"
        className="stroke-peach dark:stroke-peach-dark draw-stroke" pathLength={100} />
      <circle cx="166" cy="24" r="3" className="fill-peach dark:fill-peach-dark" />
    </svg>
  );
}

const MOTIFS: Record<string, () => React.JSX.Element> = {
  "DocDefend+": DocDefendMotif,
  "Parkinson's Voice Screening": ParkinsonsMotif,
};

function CardArrow({ external }: { external: boolean }) {
  return (
    <div className="absolute top-4 right-4 text-ink-faint/40 dark:text-night-muted/40
      group-hover:text-ink-muted dark:group-hover:text-night-muted
      transition-colors duration-200">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

// Shared inner content for emphasized + standard tiers.
function CardBody({ project, emphasized, drawn }: { project: Project; emphasized: boolean; drawn: boolean }) {
  const s = ACCENT_STYLES[project.accent];
  const Motif = emphasized ? MOTIFS[project.name] : undefined;
  return (
    <>
      {Motif && (
        <div className={`mb-5 ${drawn ? "is-drawn" : ""}`}>
          <Motif />
        </div>
      )}
      <h3
        className={`${emphasized ? "text-xl sm:text-2xl" : "text-lg"} font-[family-name:var(--font-display)]
          text-ink dark:text-night-text mb-1 leading-tight`}
      >
        {project.name}
      </h3>
      <p className="text-sm font-[family-name:var(--font-badge)] italic text-ink-subtle dark:text-night-muted mb-1">
        {project.subtitle}
      </p>
      <p className="text-[12px] font-[family-name:var(--font-mono)] tracking-wide text-ink-subtle dark:text-night-muted mb-3">
        {project.provenance}
      </p>
      <p className="text-sm font-[family-name:var(--font-body)] text-ink dark:text-night-text/70 leading-relaxed mb-4 flex-1">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.pills.map((pill) => (
          <span
            key={pill}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
              ${s.bg} border ${s.border}
              text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
              ${s.text}`}
          >
            <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
            {pill}
          </span>
        ))}
      </div>
      {project.url && <CardArrow external={!project.url.startsWith("/")} />}
    </>
  );
}

// Link/a/div shell — same three variants the flat grid used.
function CardShell({
  project,
  className,
  style,
  children,
}: {
  project: Project;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (project.url?.startsWith("/")) {
    return (
      <Link href={project.url} aria-label={`${project.name} — ${project.subtitle}`} className={className} style={style}>
        {children}
      </Link>
    );
  }
  if (project.url) {
    return (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${project.name} — ${project.subtitle} (opens in new tab)`}
        className={className}
        style={style}
      >
        {children}
      </a>
    );
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

// Tier 1 — full-width plate card. The dashboard screenshot is a mounted
// print: Latte-styled in both themes, framed by fixed reg marks at lg+.
function FeaturedCard({ project, visible }: { project: Project; visible: boolean }) {
  return (
    <CardShell
      project={project}
      className={frameClass(project.accent, "grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-center p-6 sm:p-8 mb-4 sm:mb-6")}
      style={entryStyle(visible, 0)}
    >
      <div className="flex flex-col">
        <CardBody project={project} emphasized={false} drawn={false} />
      </div>
      <div className="order-first lg:order-last relative lg:m-4">
        <div aria-hidden="true" className="absolute -inset-4 hidden lg:block">
          <span className="reg-mark top-0 left-0 border-t border-l" />
          <span className="reg-mark top-0 right-0 border-t border-r" />
          <span className="reg-mark bottom-0 left-0 border-b border-l" />
          <span className="reg-mark bottom-0 right-0 border-b border-r" />
        </div>
        <Image
          src="/work/spotify-plate.png"
          alt="KPI row and annotated monthly-hours line chart from the Spotify listening dashboard"
          width={1600}
          height={1325}
          sizes="(min-width: 1024px) 440px, (min-width: 640px) 60vw, 100vw"
          className="w-full h-auto rounded-xl border border-cream-border/60 dark:border-night-border/60"
        />
      </div>
    </CardShell>
  );
}
```

Note: the featured card's name should render LARGER than standard — after
transcribing, change `FeaturedCard`'s `CardBody` call to pass
`emphasized={true}` **only if** the double-check below fails, otherwise
leave as written: `FeaturedCard` deliberately reuses the standard body
(text-lg) because the PLATE is its prominence, and a text-2xl name plus
image would over-weight tier 1 relative to the emphasized pair's
text-xl/2xl names. This is the approved restrained-editorial reading; do
not "fix" it.

New `Projects()` body:

```tsx
export function Projects() {
  const [sectionRef, visible] = useScrollReveal();

  const featured = projects.find((p) => p.tier === "featured")!;
  const emphasized = projects.filter((p) => p.tier === "emphasized");
  const standard = projects.filter((p) => p.tier === "standard");

  return (
    <section
      ref={sectionRef}
      aria-labelledby="section-02"
      className="relative py-20 sm:py-28 bg-cream-dark/50 dark:bg-night-card/40"
    >
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader
          number="02"
          label="Projects"
          title="Things I've Built"
          visible={visible}
          align="right"
          annotation={<>fig. 02 &middot; n = {projects.length} builds &middot; clinical ML to iOS</>}
          spark={{ data: [2, 4, 3, 5, 4, 6, 7], variant: "bars" }}
        />

        {/* Header-area link to the case-study index */}
        <div
          className="flex justify-center sm:justify-end -mt-6 mb-8"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in 0.6s ease-out 400ms forwards" } : {}),
          }}
        >
          <Link
            href="/work"
            className="inline-flex items-center gap-2 py-3 text-sm font-[family-name:var(--font-body)]
              text-ink-subtle dark:text-night-muted
              hover:text-ink dark:hover:text-night-text
              transition-colors duration-200"
          >
            all case studies
            <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        {/* Tier 1 — featured plate card */}
        <FeaturedCard project={featured} visible={visible} />

        {/* Tier 2 — emphasized pair with drawn motifs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {emphasized.map((project, i) => (
            <CardShell
              key={project.name}
              project={project}
              className={frameClass(project.accent, "flex flex-col p-6 sm:p-8")}
              style={entryStyle(visible, 1 + i)}
            >
              <CardBody project={project} emphasized={true} drawn={visible} />
            </CardShell>
          ))}
        </div>

        {/* Tier 3 — compact standard grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {standard.map((project, i) => (
            <CardShell
              key={project.name}
              project={project}
              className={frameClass(project.accent, "flex flex-col p-5")}
              style={entryStyle(visible, 3 + i)}
            >
              <CardBody project={project} emphasized={false} drawn={false} />
            </CardShell>
          ))}
        </div>
      </div>
    </section>
  );
}
```

The old map/cardContent/sharedClassName/sharedStyle block is fully
replaced by the above; nothing else in the file survives from the old
component body.

- [ ] **Step 4: Typecheck, lint, unit tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tsc clean; lint only the 2 known errors; 296/296 tests.

- [ ] **Step 5: Dev-server structural check**

`npm run dev` (background), then:
- `curl -s http://localhost:3000/ | grep -o 'n = <!-- -->9<!-- --> builds'` — match
- `curl -s http://localhost:3000/ | grep -o 'spotify-plate'` — match (plate served)
- `curl -s http://localhost:3000/ | grep -c 'docdefend.health'` — ≥ 1 (URL fix live)
Kill the server.

- [ ] **Step 6: Commit**

```bash
git add components/projects.tsx lib/work/unpublished-drafts.ts
git commit -m "feat: three-tier projects bento — featured Spotify plate, emphasized motifs, compact standard grid"
```

---

### Task 3: Verification matrix, CLAUDE.md, memory

**Files:**
- Modify: `CLAUDE.md` (two spots, Step 4)
- Memory updates are the CONTROLLER's step, not this task's.

- [ ] **Step 1: Full suites + build**

Run: `npm test && npm run test:e2e && npm run build`
Expected: 296/296, 18/18, clean build.

- [ ] **Step 2: Browser matrix (production build, `npm run start`)**

Playwright MCP against http://localhost:3000/ :
- 1280×900: bento reads top-down as full-width plate card → 2 emphasized cards with motifs → 3×2 standard grid. Screenshot the section.
- Emphasized motifs draw on scroll into view (strokes animate); with `prefers-reduced-motion` emulated they render fully drawn, no animation.
- Dark mode toggle: plate renders as a mounted light print with border + reg marks; no layout shift.
- 768 width: emphasized 2-up, standard 2-up. 320 width: single column, order Spotify → DocDefend+ → Parkinson's → WIEIAD → Theli → LightERP → CTF → StudentPM → Airline; `document.documentElement.scrollWidth === 320`.
- `test ! -f components/featured-project.tsx && echo absent` — absent; Theli card renders in the standard tier (no marquee markup: exactly one Theli h3, inside the standard grid).
- Annotation: DOM text "n = 9 builds" AND `projects.length` is 9 in source.
- Plate asset response ≤ 250KB via `curl -sI` on the next/image URL or the raw `/work/spotify-plate.png`.
Kill the server.

- [ ] **Step 3: DocDefend URL check**

`curl -s -o /dev/null -w "%{http_code}" -L https://www.docdefend.health` — 200, no redirect hop from the card's URL form.

- [ ] **Step 4: Update CLAUDE.md**

1. Replace the "Projects grid order is deliberate" bullet with a "Projects bento" bullet: three tiers (featured Spotify plate card — `public/work/spotify-plate.png`, KPI-row-down crop, reg-mark mounted-print treatment; emphasized DocDefend+/Parkinson's with draw-on-reveal motifs; standard six at `lg:grid-cols-3`), DOM order = mobile order, WIEIAD description trimmed, DocDefend URL is `https://www.docdefend.health`.
2. Update the `projects.tsx` file-structure line to name the bento tiers and order.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md — projects bento pattern"
```

## Self-Review (completed at write time)

- **Spec coverage:** §1 data/order/trim/URL → Task 2 Steps 1–2; §2 featured card + asset + reg marks → Task 1 + Task 2 Step 3 (`FeaturedCard`); §3 emphasized pair + motifs → Task 2 Step 3 (`CardBody`/`MOTIFS`); §4 standard 3-col → Task 2 Step 3; §5 verification incl. marquee/count resolution → Task 2 Step 5 + Task 3. Out-of-scope items untouched.
- **Placeholders:** none — full component code, exact WIEIAD text, exact URL, exact sharp invocation.
- **Type consistency:** `tier` literals match between array and filters; `frameClass(accent, layout)` signature used identically at all three call sites; `Project` type derived from the array so `tier` narrows automatically; `MOTIFS` keyed by the exact `name` strings from the array.
