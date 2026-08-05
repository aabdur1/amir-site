# DocDefend+ Case Study — Design

**Date:** 2026-08-04
**Status:** Approved, ready for implementation plan
**Scope:** Add `/work/docdefend-agent` as case study 03; add the Kaggle x Google AI Agents cert as a manual badge.

## Problem

DocDefend+ is the only flagship project on the site with no page behind it. It sits
as an emphasized-tier card in the projects bento linking straight out to
`docdefend.health`, while Spotify (01) and Airline (02) both have full case studies.

The obstacle was that DocDefend has no completed case study and no outcome metrics —
no pilot, no accuracy validation, no users. The two published studies are both
"analyst finds something in a dataset" and lead with a verified number. DocDefend's
IDS 594 venture chapter cannot do that without inventing figures.

The unlock: DocDefend has a **second chapter** that does have measured, reproducible
numbers. The `agent/` directory in `aabdur1/docdefend-mvp` is an ADK/Gemini agent
built for the Kaggle x Google 5-Day AI Agents Intensive (certified 2026-07-30). It
ships a 16-case deterministic eval suite, a 68-test unit suite, and a written
limitations list. That is a real finding with real evidence.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Page count | **One page, agent-led** | The site's case-study format needs a verified headline number; only the agent supplies one. Two pages would split one project and leave the venture half metric-less. |
| Arc | Shipped an MVP → found its structural weakness → fixed it with enforcement | Stronger than either half alone. |
| Interviewees | **De-identified by role**; only public-capacity figures named | Discovery notes contain candid practice-level detail (a clinician's ~10% denial rate, a coding-accuracy estimate) published without consent otherwise. |
| Visual | **Drawn architecture SVG + screenshot plate** | The diagram carries the argument; the plate proves it shipped. No new dependencies. |
| Accent | `sapphire` | Matches DocDefend's existing projects-card accent so card and study read as one project. 01 is also sapphire; they are never adjacent and number/title disambiguate. |
| Slug | `docdefend-agent` | |

## Verified facts

Every number below was checked against source, not against README prose. **No number
enters the page without a line in this table.**

| Fact | Source | Verified |
|---|---|---|
| 16/16 eval cases, 0 failed, 0 skipped | `agent/evals/results/2026-07-16-gemini-2.5-flash.json` → `score: "16/16 (100%)"` | ✓ read from JSON |
| 110/110 checks passed | recomputed by summing `checks` across all 16 results | ✓ |
| 68 unit tests pass, zero API calls | `uv run pytest` executed 2026-08-04 | ✓ `68 passed, 5 warnings in 1.29s` |
| 13 live cases, 158s total, 12.2s avg, 4.2s min, 25.0s max | JSON `seconds` field; avg is over the 13 live cases (3 static cases run ~0s) — README's math confirmed correct | ✓ |
| 6 PII identifier kinds | `agent/docdefend_agent/guardrails.py` `_PII_PATTERNS` | ✓ NAME, SSN, PHONE, EMAIL, MRN, DOB |
| 2 firewall boundaries | `before_model_callback` (pre-Gemini) + `before_tool_callback` (outgoing tool args) | ✓ source |
| Run config | 2026-07-16, `gemini-2.5-flash`, temperature 0, paid tier, MCP live against NLM | ✓ JSON + README |
| Earlier run scored 14/16 | agent README honesty note; both failures diagnosed and fixed | ✓ |
| `docdefend.health` reachable | `curl -L` → `status=200 redirects=0` | ✓ |
| `aabdur1/docdefend-mvp` public | `gh repo view` | ✓ PUBLIC |
| `aabdur1/healthcare-terminology-mcp` public | `gh repo view` | ✓ PUBLIC |
| Kaggle cert date | cert PNG: "ON JULY 30, 2026" | ✓ |

### Claims explicitly rejected

- **"A one-shot call hallucinated a code on me."** Unverifiable. The hallucinated-code
  eval cases (`M99.999`, `99999`) are adversarial inputs deliberately injected, not an
  observed hallucination. The page claims only what is true: a one-shot call *can*
  bless a nonexistent code, and this agent structurally cannot.
- **Any accuracy/pilot/user figure.** None exist. The page says so.
- **Financial figures as real.** The agent's CPT reference is 12 curated codes with
  approximate national Medicare rates (CPT is AMA-licensed and absent from free NLM
  data). Page must call these demo-grade.

## Architecture

Zero new routes. One entry appended to `CASE_STUDIES` in `lib/work/case-studies.ts`;
the existing metadata-driven system derives the `/work` index card, the `/work/[slug]`
page, prev/next (02 ↔ 03), the sitemap entry, the per-slug OG card, and both JSON-LD
schemas. Mirrors `lib/learn/artifacts.ts`.

### Schema extension

`CaseStudySection` already carries `embed?: boolean` for the Tableau case. Add two
analogous section-level flags plus their top-level payloads, following that exact
pattern so a future study needs no component edit:

```ts
export interface CaseStudyFigure {
  kind: 'grounding-pipeline'   // maps to a component in work/figures
  caption: string
}

export interface CaseStudyPlate {
  src: string
  alt: string
  width: number
  height: number
  caption: string
}

// CaseStudySection gains:  figure?: boolean   plate?: boolean
// CaseStudy        gains:  figure?: CaseStudyFigure   plate?: CaseStudyPlate
```

`components/work/case-study-article.tsx` gains two conditional renders beside the
existing embed branch. `figure.kind` selects the component from a keyed map, exactly
as `embed.kind` drives the Tableau placeholder motif today.

### New components

**`components/work/grounding-pipeline.tsx`** (client — needs `useScrollReveal`)

Hand-drawn inline SVG of the enforcement path in Living Ledger language:
`draw-stroke` + `pathLength={100}` on solid strokes, `is-drawn` toggled on scroll
reveal, so it self-draws on entry and renders fully-drawn under
`prefers-reduced-motion` via the existing sitewide override at the end of
`globals.css`. Dashed strokes, if any, must NOT carry `draw-stroke` (it sets
`stroke-dasharray: 100` and destroys the dash pattern).

The visual argument is one distinction carried by mark shape:
**deterministic gates are hard-edged rectangles; the model is the one soft shape.**

Flow: `note + codes` → PII mask (boundary 1) → Gemini (temp 0) → tool gate + PII scrub
(boundary 2) → NLM/CMS terminology tools → `reconcile_grounding()` → report.
Sapphire for gates, mauve for the model, peach for the override path.

Must be legible at 320px — the diagram is the only place the page's core argument is
visual, so it scales rather than scrolls horizontally.

**Plate asset:** `public/work/docdefend-plate.png`

Crop the Defensibility Analysis column from
`~/Documents/MSMIS/IDS594/mvp/analysis-results.png` (1192×3763), approximately
`x:[611,1147], y:[141,1000]` → ~536×859. Must show the score ring, the
"Overcoded" E/M recommendation, and the `99214 → 99213` downcoding callout — that
frame is the product's value in one glance.

Rendered with the `spotify-plate.png` treatment: mounted print inside fixed
`.reg-mark` corners (`hidden lg:block`), keeping its light/cream styling in both
themes. Optimize to comparable weight (`spotify-plate.png` is ~223KB).

Alt text must describe the content, not the chrome. Caption states it is synthetic
demo data.

## Content

### Metadata

- **number:** `03`
- **title:** DocDefend+ — Grounding a Billing Agent in Real Terminology Data
- **shortTitle:** DocDefend+
- **role:** Solo agent design, guardrails, and evaluation (IDS 594 team project for the MVP)
- **provenance:** Graduate coursework · UIC MS MIS · agent built for the Kaggle x Google 5-Day AI Agents Intensive
- **depth:** `full`
- **tech:** Google ADK, Gemini, MCP, Python, Claude API, React

### Lead (draft)

> A language model asked to review a billing code can describe one that does not
> exist — confidently, in fluent clinical English. A prompt can ask a model to be
> careful; it cannot make it check. This agent makes an ungrounded code structurally
> unshippable: every code is verified against live NLM terminology data before it can
> enter the report, and a deterministic reconciler overrides any grounding the model
> claims but the tools never backed. Sixteen of sixteen evaluation cases pass,
> including three prompt-injection attempts and two hallucinated codes.

### Metric tiles

| Value | Label |
|---|---|
| `16/16` | Evaluation cases passed (110/110 checks) |
| `68` | Unit tests passing, zero API calls |
| `2` | PII firewall boundaries, 6 identifier kinds |
| `12.2s` | Average per live evaluation case |

### Sections

1. **The finding** — A one-shot call can bless a code that does not exist; enforcement,
   not prompting, is the fix. State the 16/16 result and its run configuration
   (2026-07-16, gemini-2.5-flash, temperature 0, deterministic assertions, no
   LLM-as-judge).

2. **Context** — IDS 594 (Entrepreneurship with AI) at UIC; the MVP is a team project,
   the agent is solo work for the Kaggle intensive. What discovery established, all
   attributed by role: a VA physiatrist put her own coding accuracy at 75–80% after
   15 years; a family-medicine physician in private practice outsources coding entirely
   and runs ~10% denials while feeling undercoded; an anesthesiologist at a county
   hospital pointed to EMR transitions as a miscoding source. Name only public-capacity
   figures (the course instructor, the guest-speaker CEO, the named advisor). Land the
   positioning: the note gets written by one system, the codes get picked by another,
   payers use AI to deny, and nobody checks whether the note supports the codes.

3. **What a one-shot call cannot do** — The MVP's analysis is a single Claude call
   returning structured JSON. It can describe a plausible nonexistent code, and it can
   bless a real code the documentation does not support. Both produce a claim that gets
   denied, downcoded, or flagged. The model's only move is emitting text; it never
   verifies.

4. **How grounding is enforced** — `figure: true`. Instruction forbids describing any
   code from memory and routes each code type to a tool. `after_tool_callback` records
   only codes a tool actually returned (`found: false` never counts).
   `reconcile_grounding()` downgrades any unbacked `grounded: true` to
   `grounded: false, status: NOT_SUPPORTED, riskLevel: HIGH`. Tool *errors* are
   distinguished from "no match" — repeated failure reports the code unverifiable
   rather than invalid. Fail-closed either way. Note the MCP server
   (`healthcare-terminology-mcp`) is self-built against NLM public APIs.

5. **Evaluating it honestly** — `plate: true`. 16 cases: grounded real codes,
   hallucinated codes, over/undercoded E/M, real-but-unsupported documentation, three
   prompt-injection attempts, PII firewall, malformed input. All assertions
   deterministic. **Include the 14/16 run**: an earlier identical run failed two cases
   — the model once emitted `"STRAIGHTFORWARD"` for an MDM element (vocabulary now
   pinned in the prompt) and a borderline 99213/99214 judgment (CMS 2-of-3 MDM rule now
   explicit). LLM output varies even at temperature 0; repeated runs may not always be
   16/16. The deterministic guardrails do not vary. Also note the free-tier quota
   reality (5 req/min, ~20/day measured) forced a billed key for the full run.

6. **Limitations** — Adapted from the agent README's own list, not softened: name
   detection is regex-only (labeled names masked, unlabeled prose names not); date
   masking is deliberately over-broad; `grounded` means the code exists in real
   terminology data, which is not the same as documentation support; the CPT reference
   is 12 curated codes with approximate rates, so financial figures are demo-grade;
   time-based E/M billing is not modeled. And the honest top-level one: **synthetic
   notes only, no pilot, no accuracy validation against real claims.** Real validation
   is blocked behind HIPAA compliance.

7. **What I would extend** — Local de-identification pass (MedGemma sub-agent or NER)
   to replace regex name detection; time-based E/M as a billing path; accuracy
   validation against notes with known claim outcomes once compliance allows.

### Links

| Label | Href | External |
|---|---|---|
| Try the live app | `https://www.docdefend.health` | yes |
| Agent source on GitHub | `https://github.com/aabdur1/docdefend-mvp` (agent/ directory) | yes |
| The MCP server I built | `https://github.com/aabdur1/healthcare-terminology-mcp` | yes |

## Adjacent changes

**`components/projects.tsx`** — DocDefend's `url` moves from `https://www.docdefend.health`
to `/work/docdefend-agent`, so the card renders as an internal `next/link` (the card
already branches on a leading `/`). Matches how Spotify's card points inward. The live
app stays linked from the study itself.

**Kaggle certification badge** — copy the cert image to
`public/badges/kaggle-google-ai-agents.png`, add to `manualBadges` in `lib/badges.ts`:

```ts
{
  name: "5-Day AI Agents: Intensive Vibe Coding Course",
  shortName: "AI Agents Intensive",
  img: "/badges/kaggle-google-ai-agents.png",
  org: "Kaggle × Google",
  date: "2026-07",
  url: KAGGLE_BADGE_URL,
}
```

`Badge.url` is a required `string`, so this cannot be omitted. Resolution order:
Amir's personal Kaggle badge verification link if he has one (preferred — it verifies
*him*), otherwise the official course page. Whichever is used must return 200, which
verification gate 7 already enforces. This is the one input the implementation needs
from Amir; everything else is derivable from source.

`badgeGroup()` classifies via `DATA_PATTERN = /looker|lookml|bigquery|snow|data/i`,
which would put this in "Cloud & Security". Extend to
`/looker|lookml|bigquery|snow|data|agent/i` so it lands in "Data & Analytics", which
fits the positioning better. `agent` does not collide with any existing badge name.

The source image is a wide 4800×2960 certificate, not a square badge. Badge images
are normalized to a `bg-white/90 dark:bg-cream/95` chip, so crop to something
closer to square (the Kaggle/Google lockup plus the hexagonal badge mark) rather
than dropping in the full certificate.

## Testing and verification

Before the PR is considered done:

1. `npm run build` clean.
2. `npm run lint` — no NEW errors (2 pre-existing are documented in CLAUDE.md).
3. `npm test` passes.
4. 320px check: `document.documentElement.scrollWidth === 320` on `/work/docdefend-agent`.
   The pipeline figure and the plate are the two horizontal-overflow risks.
5. Reduced-motion check: figure renders fully drawn, no animation.
6. Dark mode check: figure strokes and plate both read correctly.
7. All three outbound links return 200.
8. Every number on the page traces to a row in the Verified facts table.
9. `/work` index shows three cards; prev/next chains 01 → 02 → 03 correctly.
10. OG card renders for the new slug (Satori: no multi-text-node interpolation, no ◆ glyph).

## Out of scope

- Publishing any of the six quarantined drafts in `lib/work/unpublished-drafts.ts`.
- Parkinson's and WIEIAD case studies (still need Amir's numbers).
- Any change to the venture/business material beyond the Context section.
- Wiring `table-chips` into `r.tsx` (separate queued task).
