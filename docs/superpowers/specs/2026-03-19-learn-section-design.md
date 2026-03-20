# Learn Section — Interactive Data Mining Explainers

## Overview

Add a `/learn` section to amirabdurrahim.com featuring 6 interactive data mining concept explainers, converted from standalone vanilla JS/Canvas HTML artifacts into fully integrated React components matching the site's Catppuccin editorial design system.

**Purpose:** Portfolio piece showcasing ability to explain complex ML concepts interactively, doubling as a personal study tool. The section contextualizes the artifacts as "built while studying IDS 572."

**Source artifacts** (in `../data_mining_artifacts/`):
1. `gradient_descent_interactive_explainer.html`
2. `regularization_lambda_bias_variance.html`
3. `normality_logloss_crossentropy.html`
4. `pca_dimensionality_reduction.html`
5. `clustering_three_algorithms.html`
6. `shap_interpretability.html`

## Architecture

### Approach: One component per artifact

Each artifact is a self-contained React component containing all its sections, Canvas drawing logic, and state. No shared Canvas abstraction layer — duplication of boilerplate (DPR scaling, resize observers) is acceptable for 6 artifacts and keeps each file independent.

This matches the existing codebase pattern where section components (experience.tsx, projects.tsx, etc.) are each self-contained.

### File structure

```
app/learn/
  page.tsx                    # Index page — card grid of all 6 artifacts
  opengraph-image.tsx         # Branded OG image for /learn (Catppuccin Mocha, 1200x630)
  [slug]/
    page.tsx                  # Dynamic route — resolves slug, renders artifact component
    layout.tsx                # Shared layout: back link, scroll reveal, prev/next nav
components/learn/
  learn-card.tsx              # Index page card (illustration + number + title + tags)
  learn-nav.tsx               # Prev/next navigation component
  gradient-descent.tsx        # 01 — Gradient Descent
  log-loss-cross-entropy.tsx  # 02 — Log Loss & Cross-Entropy (renumbered for conceptual flow)
  pca.tsx                     # 03 — PCA / Dimensionality Reduction
  regularization.tsx          # 04 — Regularization / Bias-Variance
  clustering.tsx              # 05 — Clustering (K-means, Hierarchical, DBSCAN)
  shap.tsx                    # 06 — SHAP / Interpretability
lib/learn/
  artifacts.ts                # Single source of truth: slug, title, description, order, subtopics
```

### Metadata-driven design

`lib/learn/artifacts.ts` is the single source of truth for all artifact metadata. The index page, prev/next nav, OG images, sitemap entries, and JSON-LD schema all derive from this array. Adding a future artifact means: create the component, add an entry to the array, done.

Planned future artifacts (not in initial scope): Decision Trees, Random Forest, Gradient Boosting, KNN.

## Routing & Navigation

### URL structure

| Order | Slug | Title |
|-------|------|-------|
| 01 | `/learn/gradient-descent` | Gradient Descent |
| 02 | `/learn/log-loss-cross-entropy` | Log Loss & Cross-Entropy |
| 03 | `/learn/pca` | PCA / Dimensionality Reduction |
| 04 | `/learn/regularization` | Regularization / Bias-Variance |
| 05 | `/learn/clustering` | Clustering |
| 06 | `/learn/shap` | SHAP / Interpretability |

Order follows conceptual progression: foundational optimization → loss functions → dimensionality reduction → regularization → unsupervised learning → interpretability.

### Nav integration

"Learn" appears as a nav pill alongside "Gallery," styled with the same fill-sweep hover pattern but with a distinct accent color (mauve or peach). Nav order: **wordmark | Learn | Gallery**.

### Artifact page navigation

- **Top:** "← Back to Learn" text link
- **Bottom:** Prev/next links with artifact titles. First artifact has no prev, last has no next. Links derived from the metadata array order.

## Index Page (`/learn`)

### Header

- Mono label: `INTERACTIVE EXPLAINERS` (mauve accent, matching section label pattern)
- Display font heading: "Data Mining Concepts" (DM Serif Display)
- Subtitle: contextualizes as study tools — "Built while studying IDS 572 — interactive tools for understanding machine learning fundamentals"
- Mauve accent rule with `line-grow` animation

### Card grid

- 2 columns on desktop, 1 column on mobile
- Each card contains:
  - **SVG illustration area** — shaded gradient background with a concept-specific mini graphic (loss curve for GD, bar chart for PCA, cluster scatter for clustering, etc.)
  - **`01/` peach numbered label** — mono font, matching landing page section pattern
  - **DM Serif Display title**
  - **Subtopic list** — muted text, dot-separated (e.g. "Loss curves · Learning rate · Batch variants")
  - **Accent-colored pills** — tab/section count + "Interactive" tag, cycling through sapphire/mauve/peach/lavender
- `card-hover` lift effect on hover
- Scroll reveal with staggered `fade-in-up` animation
- Each card links to `/learn/[slug]`

## Individual Artifact Pages

### Layout (shared)

Handled by `app/learn/[slug]/layout.tsx`:
- Back link at top
- Content area for the artifact component
- Prev/next nav at bottom (via `learn-nav.tsx`)

### Artifact component structure

Former tabs become scrollable sections:
- **Page header:** mono label (e.g. `01/ GRADIENT DESCENT`), display font full title, brief description, mauve accent rule
- **Sections** separated by `SectionDivider` (diamond ornament), each with:
  - Section subheading (DM Serif Display)
  - Interactive Canvas area + controls (sliders, buttons, toggles)
  - Insight/explanation text below or beside the Canvas
- Scroll reveal on each section (staggered `fade-in-up`)
- Alternating section backgrounds (transparent → `bg-cream-dark/50 dark:bg-night-card/40` → transparent)

### Canvas rendering

- `useRef` + `useEffect` for Canvas drawing
- `ResizeObserver` for responsive sizing
- DPR (device pixel ratio) scaling for retina displays
- Sliders and buttons are React-controlled (`useState`) styled with Catppuccin tokens
- Animation loops via `requestAnimationFrame`, cleaned up in `useEffect` return
- `prefers-reduced-motion` respected — static renders instead of animations

### Dark mode

- Uses `.dark` class toggle (not `prefers-color-scheme` like the originals)
- Canvas colors swap between Latte and Mocha palettes
- Colors read from CSS custom properties or a theme-aware hook

### Accessibility

- Canvas areas: `role="img"` with descriptive `aria-label`
- Slider controls: proper `<label>` + `<input type="range">` with `aria-valuetext`
- Buttons: clear text labels
- Focus rings: global `:focus-visible` style (2px mauve outline, 3px offset)
- Section containers: `aria-labelledby` referencing their headings
- Decorative SVGs (card illustrations): `aria-hidden="true"` + `focusable="false"`

## SEO & Metadata

### Sitemap

Add to `app/sitemap.ts`:
- `/learn` — priority 0.8, changeFrequency monthly
- Each `/learn/[slug]` — priority 0.7, changeFrequency monthly
- Slugs derived from the metadata array

### Page metadata

- `/learn` index: static `metadata` export — title "Learn — Interactive Data Mining Explainers", description, canonical URL
- `/learn/[slug]`: dynamic `generateMetadata` — title like "Gradient Descent — Interactive Explainer", description from artifact metadata, canonical URL

### OG images

- `app/learn/opengraph-image.tsx` — branded 1200x630 Catppuccin Mocha image with "Data Mining Concepts" + "Interactive Explainers"
- Individual artifact pages inherit the learn OG image (no per-artifact OG images in initial scope)

### JSON-LD: LearningResource schema

Each artifact page includes a `LearningResource` JSON-LD object generated from artifact metadata:
- `name` — artifact title
- `description` — what it teaches
- `educationalLevel` — "Graduate"
- `learningResourceType` — "Interactive simulation"
- `teaches` — specific concepts (from subtopics in metadata)
- `url` — canonical URL

This auto-generates from the metadata array, so future artifacts get it for free.

## Out of Scope

- **No search/filter on index page** — 6 cards don't need it. Revisit at 15+.
- **No progress tracking** — this is a portfolio piece, not an LMS.
- **No comments or discussion** — keep it static.
- **No print styles** — Canvas interactions don't print meaningfully.
- **No separate mobile-optimized Canvas interactions** — responsive via ResizeObserver, same interactions on touch and desktop.
- **No shared Canvas abstraction layer** — each artifact is self-contained. Extract shared patterns later if the section grows significantly.
- **No per-artifact OG images** — shared learn OG image is sufficient for initial launch.
