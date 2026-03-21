---
name: compare-artifacts
description: Compare learn artifacts for pattern consistency — checks shared sub-components, text sizes, layout, and Canvas patterns match across all 6
disable-model-invocation: true
---

# Compare Learn Artifacts

Check that all learn artifact components follow the same patterns and haven't drifted apart during independent development.

## Arguments

Optional: two slugs to compare (e.g., `gradient-descent pca`). Default: compare all 6.

## What to Compare

### Shared Sub-Components

Each artifact defines its own local copies of helper components/functions. Check they're consistent:

| Component | Expected Pattern |
|-----------|-----------------|
| `getThemeColors()` | Same color map across all artifacts |
| `setupCanvas()` | Same DPR + resize logic |
| `MetricCard` | Same padding (`px-4 py-2.5`), label size (`text-[13px]`), value size (`text-base`) |
| `InsightBox` | Same padding (`px-4 py-3`), text size (`text-sm`), bg color (`sapphire/10`) |
| `WarnBox` | Same pattern as InsightBox but amber (only in some artifacts) |
| `useDarkModeObserver` | Same MutationObserver logic |
| `useCanvasResize` | Same ResizeObserver logic |
| `METRIC_COLORS` | Same 5-color map |

### For Each Pair of Artifacts, Check:

1. **Text sizes match** — grep for `text-[Npx]` patterns, verify they use the same sizes for the same purposes
2. **Button styling matches** — grep for button class patterns, compare
3. **Slider styling matches** — label width, value display, same flex layout
4. **Section structure** — `py-8` on sections, `py-12 [&>div]:mb-0` on dividers
5. **Main container** — all use `mx-auto max-w-5xl px-6 sm:px-10 lg:px-12`
6. **Canvas heights** — document what heights each artifact uses (not necessarily identical but should be intentional)

### Report

Output a comparison table:

```
| Pattern                  | GD  | LL  | PCA | Reg | Clust | SHAP |
|--------------------------|-----|-----|-----|-----|-------|------|
| MetricCard label size    | 13px| 13px| 13px| 13px| 13px  | 13px |
| InsightBox text size     | sm  | sm  | sm  | sm  | sm    | sm   |
| Section py               | py-8| py-8| py-8| py-8| py-8  | py-8 |
| ...                      |     |     |     |     |       |      |
```

Flag any cells that differ from the majority as **inconsistencies** with file:line references.

### Deduplication Opportunities

If the same helper (e.g., `getThemeColors`) is copy-pasted identically across all 6 files, note it as a candidate for extraction to a shared `lib/learn/helpers.ts` — but do NOT extract it (just flag the opportunity for the user to decide).
