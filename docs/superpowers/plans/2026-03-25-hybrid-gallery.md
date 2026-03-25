# Hybrid Gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the gallery with randomized default order, varied image sizes via CSS Grid, and a View Transition morph effect when opening the lightbox — while keeping the existing lightbox library for zoom/keyboard/swipe.

**Architecture:** Three independent changes to the gallery. (1) Replace sort logic with shuffle-default + sort-on-demand. (2) Replace CSS `columns` with CSS Grid where some images span 2 rows for visual variety. (3) Add `view-transition-name` to clicked thumbnail so the lightbox open is animated via View Transitions API. The existing `yet-another-react-lightbox` stays for fullscreen viewing.

**Tech Stack:** CSS Grid, Fisher-Yates shuffle, View Transitions API (`document.startViewTransition`), existing lightbox library.

---

## File Map

| File | Change | Responsibility |
|------|--------|----------------|
| `components/gallery/masonry-grid.tsx` | Modify | Shuffle logic, CSS Grid layout, View Transition on lightbox open |
| `components/gallery/photo-card.tsx` | Modify | Accept `tall` prop for span-2 cards, set `view-transition-name` on click |
| `components/gallery/sort-controls.tsx` | Modify | Add "Shuffle" option as default, rename current "Date" sort |
| `app/globals.css` | Modify | Add `::view-transition` CSS for gallery morph |

---

### Task 1: Random Default Order with Shuffle

Replace the default "sort by date" with a shuffled order. When a sort is selected, photos snap to that order. Add a "Shuffle" option to return to random.

**Files:**
- Modify: `components/gallery/masonry-grid.tsx`
- Modify: `components/gallery/sort-controls.tsx`

- [ ] **Step 1: Add Fisher-Yates shuffle utility**

In `masonry-grid.tsx`, add above the component:

```typescript
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

- [ ] **Step 2: Change sort state to include 'shuffle' as default**

Change the `SortBy` type and default:

```typescript
type SortBy = 'shuffle' | 'date' | 'camera' | 'lens'
```

Change `useState<SortBy>('date')` to `useState<SortBy>('shuffle')`.

- [ ] **Step 3: Update sortedPhotos memo to handle shuffle**

The shuffle must be stable (same order until user requests re-shuffle). Use a `useRef` to store the initial shuffled order:

```typescript
const shuffledRef = useRef<Photo[]>([])
if (shuffledRef.current.length !== photos.length) {
  shuffledRef.current = shuffle(photos)
}

const displayPhotos = useMemo(() => {
  if (sortBy === 'shuffle') return shuffledRef.current
  return [...photos].sort((a, b) => {
    if (sortBy === 'date') return b.date.localeCompare(a.date)
    if (sortBy === 'camera') return a.camera.localeCompare(b.camera)
    if (sortBy === 'lens') return a.lens.localeCompare(b.lens)
    return 0
  })
}, [photos, sortBy])
```

Replace all references to `sortedPhotos` with `displayPhotos`.

- [ ] **Step 4: Update sort controls to include Shuffle option**

In `sort-controls.tsx`, add Shuffle to OPTIONS:

```typescript
const OPTIONS = [
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'date', label: 'Date' },
  { value: 'camera', label: 'Camera' },
  { value: 'lens', label: 'Lens' },
]
```

When shuffle is selected, re-shuffle the array. In `masonry-grid.tsx`, when `sortBy` changes to `'shuffle'`, regenerate the shuffled order:

```typescript
useEffect(() => {
  if (sortBy === 'shuffle') {
    shuffledRef.current = shuffle(photos)
  }
  setVisibleCount(BATCH_SIZE)
}, [sortBy, photos])
```

The label display in sort controls trigger: when shuffle is active, show "Sort: Shuffle" in the button.

- [ ] **Step 5: Verify and commit**

Test: reload the page multiple times — photo order should be different each time. Select "Date" — photos sort newest first. Select "Shuffle" — photos re-randomize.

```bash
git add components/gallery/masonry-grid.tsx components/gallery/sort-controls.tsx
git commit -m "feat: gallery shuffle default order with sort options"
```

---

### Task 2: CSS Grid with Varied Image Sizes

Replace CSS `columns` layout with CSS Grid where every 5th image spans 2 rows, creating visual variety. The grid maintains responsive columns and works with progressive loading.

**Files:**
- Modify: `components/gallery/masonry-grid.tsx` (change grid container classes)
- Modify: `components/gallery/photo-card.tsx` (accept `tall` prop, add `row-span-2`)

- [ ] **Step 1: Change grid container from columns to CSS Grid**

In `masonry-grid.tsx`, replace the grid container:

```diff
- <div className="columns-1 sm:columns-2 xl:columns-3 gap-5">
+ <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[300px]">
```

The `auto-rows-[300px]` sets a base row height. Normal images occupy 1 row (300px), tall images span 2 rows (600px).

- [ ] **Step 2: Add `tall` prop to PhotoCard**

In `photo-card.tsx`, add the prop:

```typescript
interface PhotoCardProps {
  photo: Photo
  index: number
  tall?: boolean
  onClick: () => void
}
```

On the outer `<button>`, add the span class conditionally:

```diff
- className={`mb-4 break-inside-avoid cursor-zoom-in rounded-lg text-left w-full ${
+ className={`cursor-zoom-in rounded-lg text-left w-full ${tall ? 'row-span-2' : ''} ${
```

Remove `mb-4` and `break-inside-avoid` — these were for CSS columns layout and aren't needed with CSS Grid (the `gap` handles spacing).

The image should fill the card height. Change the image container:

```diff
- <div className="overflow-hidden rounded-lg">
+ <div className="overflow-hidden rounded-lg h-full">
```

And the image wrapper:

```diff
- <div ref={imgWrapperRef} className="will-change-transform">
+ <div ref={imgWrapperRef} className="will-change-transform h-full">
```

And the image itself needs to fill and cover:

```diff
- className={`w-full h-auto transition-[filter] duration-700 ease-out ${
+ className={`w-full h-full object-cover transition-[filter] duration-700 ease-out ${
```

- [ ] **Step 3: Pass `tall` prop from grid**

In `masonry-grid.tsx`, determine which photos are tall. Use a simple repeating pattern — every 5th image starting from index 2:

```tsx
{displayPhotos.slice(0, visibleCount).map((photo, i) => (
  <PhotoCard
    key={photo.url}
    photo={photo}
    index={i}
    tall={i % 5 === 2}
    onClick={() => {
      setLightboxIndex(i)
      setLightboxOpen(true)
    }}
  />
))}
```

This means images at index 2, 7, 12, 17... are tall (span 2 rows). Creates a consistent visual rhythm.

- [ ] **Step 4: Adjust auto-rows for mobile**

On mobile (single column), the tall images should just be taller, not spanning grid rows. Update the grid classes:

```
grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[250px] sm:auto-rows-[300px]
```

- [ ] **Step 5: Verify and commit**

Test: gallery should show a grid with some images taller than others. Resize browser — layout should adapt. Progressive loading should still work. Parallax should still work on each image.

```bash
git add components/gallery/masonry-grid.tsx components/gallery/photo-card.tsx
git commit -m "feat: CSS Grid gallery with varied image sizes"
```

---

### Task 3: View Transition Morph on Lightbox Open

When a photo is clicked, use the View Transitions API to morph the thumbnail into the lightbox. The thumbnail gets a temporary `view-transition-name`, then `startViewTransition` triggers the lightbox open with a smooth expansion animation.

**Files:**
- Modify: `components/gallery/masonry-grid.tsx` (wrap lightbox open in startViewTransition)
- Modify: `components/gallery/photo-card.tsx` (set view-transition-name on click)
- Modify: `app/globals.css` (add view-transition CSS for gallery morph)

- [ ] **Step 1: Add gallery view-transition CSS**

In `globals.css`, add after the existing view-transition rules:

```css
/* Gallery: morph thumbnail into lightbox */
::view-transition-old(gallery-photo) {
  animation: none;
}
::view-transition-new(gallery-photo) {
  animation: gallery-morph-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes gallery-morph-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- [ ] **Step 2: Set view-transition-name on clicked photo**

In `photo-card.tsx`, when clicked, set `view-transition-name` on the image wrapper before calling `onClick`:

Add a ref callback approach. Modify the `onClick` handler:

```typescript
const handleClick = useCallback(() => {
  // Set view-transition-name on this specific image for the morph
  const wrapper = imgWrapperRef.current
  if (wrapper) {
    wrapper.style.viewTransitionName = 'gallery-photo'
  }
  onClick()
}, [onClick])
```

Use `handleClick` instead of `onClick` on the button. After the lightbox closes, clear the name (handled in step 3).

- [ ] **Step 3: Wrap lightbox open in startViewTransition**

In `masonry-grid.tsx`, modify the click handler to use View Transitions:

```typescript
const openLightbox = useCallback((index: number) => {
  const open = () => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (document.startViewTransition) {
    document.startViewTransition(open)
  } else {
    open()
  }
}, [])
```

Pass this to PhotoCard:

```tsx
onClick={() => openLightbox(i)}
```

When the lightbox closes, clear the `view-transition-name` from all images to prevent conflicts:

```typescript
const closeLightbox = useCallback(() => {
  setLightboxOpen(false)
  // Clear view-transition-name from all images
  document.querySelectorAll('[style*="view-transition-name"]').forEach(el => {
    (el as HTMLElement).style.viewTransitionName = ''
  })
}, [])
```

Use `closeLightbox` in the Lightbox `close` prop.

- [ ] **Step 4: Verify and commit**

Test in Chrome/Firefox: click a photo — it should morph/scale into the lightbox with a smooth transition. Click close — lightbox closes normally. Test in Safari — should fall back to instant open (no View Transition support needed for basic fallback).

Test that the dark mode circular toggle still works (different `view-transition-name`, shouldn't conflict).

```bash
git add components/gallery/masonry-grid.tsx components/gallery/photo-card.tsx app/globals.css
git commit -m "feat: View Transition morph on gallery lightbox open"
```

---

## Implementation Order

1. **Task 1 (Shuffle)** — Logic change only, no layout changes
2. **Task 2 (CSS Grid)** — Layout change, independent of sort logic
3. **Task 3 (View Transition morph)** — Additive, works on top of both

Tasks 1 and 2 can be done in parallel (different concerns in the same files). Task 3 should come last since it adds to the click handler modified in Task 2.
