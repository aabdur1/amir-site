# DocDefend+ Case Study — Design

**Date:** 2026-08-04
**Status:** Approved by Amir 2026-08-05, ready for implementation plan
**Scope:** Add `/work/docdefend-agent` as case study 03; add the Kaggle x Google AI Agents cert as a manual badge.

### Revisions

| Date | Change |
|---|---|
| 2026-08-04 | Initial spec. Header read "Approved" before Amir had actually reviewed it — premature. |
| 2026-08-04 | Kaggle badge URL supplied and verified; badge asset added and renamed. Last open input closed. |
| 2026-08-05 | Independent review ([review doc](./2026-08-04-docdefend-case-study-design-review.md)) re-verified every number against source; all hold. Applied its edits 1, 4, 5 — interviewee de-identification tightened from *by role* to *by specialty only*, status line corrected, title-length check added. Edit 2 already applied; edit 3 stale (see review disposition). Amir signed off. |

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
| Interviewees | **De-identified by specialty only** — no employer type, tenure, or pronouns; only public-capacity figures named | Discovery notes contain candid practice-level detail (a clinician's ~10% denial rate, a self-estimated coding accuracy) published without consent otherwise. Specialty + employer type + tenure + a gendered pronoun, printed next to named public figures on a site tied to Amir's identity, is re-identifying to anyone in the class or the interviewee's own circle. The numbers carry the argument; the biography does not. |
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
| Free tier: 5 requests/min, ~20/day | agent README, marked "measured 2026-07-16" | ✓ |
| ~60–80 requests for a full live run | agent README line 104 — **the README's own estimate, not an independently measured count.** Page copy must not imply it was measured. | ✓ as an estimate |
| 75–80% self-estimated coding accuracy | `IDS594/docs/customer-discovery.md` — interview note. A clinician's self-estimate, not an audited figure; page copy says "self-estimated". | ✓ |
| ~10% denial rate | `IDS594/docs/customer-discovery.md` — interview note, practice-reported. | ✓ |
| Plate on-screen figures: defensibility score 25/100, downcoding delta ≈$40/visit | Read directly off the 1192×640 crop during asset verification. These are outputs of a **synthetic** demo note; the plate caption says so. | ✓ by inspection |
| 12 curated CPT codes | Parsed `agent/docdefend_agent/cpt_reference.py` — exactly 12: 20610, 64483, 64490, 64635, 77003, 96372, 99203, 99204, 99205, 99213, 99214, 99215 | ✓ counted at source |
| Plate alt-text codes 99214 and 99213 | Both present in the 12-code reference above, and both legible in the 1192×640 crop | ✓ |
| Three prompt-injection eval cases | `agent/evals/eval_cases.json` — ids `eval-injection-blanket-approve`, `eval-injection-skip-tools`, `eval-injection-exfil` | ✓ counted at source |
| Two fabricated code values (M99.999, 99999) | `agent/evals/eval_cases.json` — the two distinct invented codes across the hallucination cases | ✓ |
| CMS two-of-three MDM rule now explicit in the instruction | agent README line 100 — **the README's own statement about a fix it made.** The phrase does not appear verbatim in `prompts.py`, so this is README-sourced like the ~60–80 request estimate, not independently re-derived from the prompt text. | ✓ as README-stated |

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

Crop from `~/Documents/MSMIS/IDS594/mvp/analysis-results.png` (1192×3763) at
`{left: 0, top: 130, width: 1192, height: 640}` → **1192×640, ~117KB**. Coordinates
executed and the output visually inspected on 2026-08-04.

*(Revised 2026-08-05: the spec originally called for a right-column-only crop at
~536×859. The full-width crop supersedes it — it shows the clinical note going in
and the scored report coming out as one frame, still contains everything the
original required (score ring, "Overcoded", `99214 → 99213`, the ≈$40 callout), and
at 1192px wide it has the resolution headroom a 536px column crop did not.)*

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
   the agent is solo work for the Kaggle intensive. What discovery established,
   **attributed by specialty only** — no employer type, no tenure, no gendered
   pronouns: a physiatrist self-estimated their coding accuracy at 75–80%; a
   family-medicine physician outsources coding entirely and runs ~10% denials while
   feeling undercoded; an anesthesiologist pointed to EMR transitions as a miscoding
   source. Name only public-capacity figures (the course instructor, the guest-speaker
   CEO, the named advisor). Land the positioning: the note gets written by one system,
   the codes get picked by another, payers use AI to deny, and nobody checks whether
   the note supports the codes.

   **Drafting constraint:** when writing this prose, do not reintroduce identifying
   detail that is present in the source discovery notes — employer ("VA", "private
   practice in Dallas", "county hospital"), tenure ("after 15 years"), or pronouns.
   Restructure sentences rather than reaching for "he"/"she".

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
  url: "https://www.kaggle.com/certification/badges/amirabdurrahim/108",
}
```

Badge URL supplied by Amir and verified 200 on 2026-08-04. It is Amir's personal
certification badge, so it verifies the credential holder rather than merely linking
the course.

**Asset is already in place:** `public/badges/kaggle-google-ai-agents.png`, 537×572,
transparent background — Amir cropped the badge mark out of the wide certificate, so
no further cropping is needed. Renamed from the original spaces-and-punctuation
filename to match the kebab-case convention of the other four manual badges.

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
11. Long-title check. This title is a two-part shape ("DocDefend+ — Grounding a Billing
    Agent in Real Terminology Data") where 01 and 02 are plain. `shortTitle` should
    absorb most of it, but eyeball the `/work` index card, the prev/next labels, and
    the OG card for wrapping or truncation.

## Out of scope

- Publishing any of the six quarantined drafts in `lib/work/unpublished-drafts.ts`.
- Parkinson's and WIEIAD case studies (still need Amir's numbers).
- Any change to the venture/business material beyond the Context section.
- Wiring `table-chips` into `r.tsx` (separate queued task).
