---
name: add-artifact
description: Add a new interactive learn artifact — creates component, updates metadata, wires dynamic import
disable-model-invocation: true
---

# Add Learn Artifact

Add a new interactive data mining explainer to the `/learn` section.

## Arguments

The user provides: artifact name and source HTML file path (if converting from existing).

## Steps

1. **Add metadata entry** to `lib/learn/artifacts.ts` — append to the `ARTIFACTS` array with slug, title, shortTitle, description, number (next in sequence), subtopics, and sectionCount.

2. **Create component** at `components/learn/{slug}.tsx`:
   - `"use client"` directive
   - Follow patterns from existing artifacts (read `components/learn/gradient-descent.tsx` for reference):
     - `getThemeColors()` for Canvas colors
     - `setupCanvas()` with DPR scaling
     - `useDarkModeObserver` + `useCanvasResize` hooks
     - `MetricCard`, `InsightBox` sub-components
     - `useScrollReveal()` for section entrance
     - `SectionDivider` between sections
     - `py-8` on each `<section>`
     - `aria-labelledby` on sections, `role="img"` on canvases
     - Section headings with unique ID prefix
   - If converting from HTML source: read the source file, port Canvas logic to useRef + useEffect, port tabs to scrollable sections
   - Export as named export matching the component name

3. **Wire up in page.tsx** — in `app/learn/[slug]/page.tsx`:
   - Add dynamic import: `const ComponentName = dynamic(() => import('@/components/learn/{slug}').then(m => ({ default: m.ComponentName })))`
   - Add to `ARTIFACT_COMPONENTS` map: `'{slug}': ComponentName,`

4. **Add SVG illustration** to the index page — in `app/learn/page.tsx`:
   - Create an illustration function for the new artifact
   - Add to the `ILLUSTRATIONS` record

5. **Verify**:
   - Run `npx tsc --noEmit`
   - Run `npm run build`
   - Check the artifact renders at `/learn/{slug}`

6. **Update CLAUDE.md** — add the new component to the file structure section.

7. **Commit** with message: `feat(learn): add {artifact name} interactive explainer`
