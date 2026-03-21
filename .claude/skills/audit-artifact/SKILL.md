---
name: audit-artifact
description: Audit a learn artifact for dark mode, text sizes, Canvas responsiveness, accessibility, and consistency with site patterns
disable-model-invocation: true
---

# Audit Learn Artifact

Run a comprehensive audit on a learn artifact component after changes.

## Arguments

The user provides: artifact slug (e.g., `gradient-descent`) or `all` to audit every artifact.

## Checklist

For each artifact component in `components/learn/`:

### 1. Dark Mode
- [ ] Search for `bg-white`, `bg-gray`, `#fff`, `#eff1f5`, or any hardcoded light colors without a `dark:` counterpart
- [ ] Search for `bg-night-base` (invalid token — should be `bg-night`)
- [ ] Verify all Canvas `getThemeColors()` usage reads both light and dark values
- [ ] Check `MutationObserver` is set up for theme change re-draws
- [ ] Visually confirm: no light-colored areas stuck in dark mode

### 2. Text Sizes (WCAG minimum 12px for readable content)
- [ ] No `text-[10px]` on readable content
- [ ] No `text-[11px]` on readable content
- [ ] MetricCard labels at `text-[13px]`, values at `text-base`
- [ ] InsightBox at `text-sm`
- [ ] Section descriptions at `text-sm` with `leading-relaxed`
- [ ] Slider labels and values at `text-sm`
- [ ] Buttons at `text-[13px]`

### 3. Canvas Responsiveness
- [ ] Every canvas uses `setupCanvas()` with DPR scaling
- [ ] `ResizeObserver` via `useCanvasResize()` on every canvas ref
- [ ] Canvas has `className="w-full rounded-lg"` with explicit `style={{ height: Npx }}`
- [ ] Canvas content doesn't overflow or clip at 320px viewport width

### 4. Accessibility
- [ ] Every `<section>` has `aria-labelledby` pointing to a heading with matching `id`
- [ ] Every `<canvas>` has `role="img"` and descriptive `aria-label`
- [ ] Every `<input type="range">` has `<label>` with `htmlFor` and `aria-valuetext`
- [ ] Every decorative SVG has `aria-hidden="true"` and `focusable="false"`
- [ ] `prefers-reduced-motion` is respected (no RAF without checking)

### 5. Cleanup
- [ ] All `useEffect` hooks return cleanup functions for RAF, observers, listeners
- [ ] No memory leaks: ResizeObserver disconnected, MutationObserver disconnected, RAF cancelled
- [ ] No unused imports or variables

### 6. Layout Consistency
- [ ] Sections wrapped in `py-8` class
- [ ] Dividers use `py-12 [&>div]:mb-0` pattern
- [ ] Main container uses `mx-auto max-w-5xl px-6 sm:px-10 lg:px-12`
- [ ] No alternating background wrappers (removed per design decision)

## Output

Report as:
- **Pass**: Check passed
- **Fail**: Issue found (include file:line and what's wrong)
- **Summary**: X/N checks passed, list of failures
