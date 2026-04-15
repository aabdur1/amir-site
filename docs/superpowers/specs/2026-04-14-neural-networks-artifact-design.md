# Neural Networks — Interactive Learn Artifact

## Overview

Add a 7th interactive artifact to `/learn` covering Neural Networks, sourced from IDS 572 exam 3 material (`Neural Networks - intro(1).pdf`). This is the canonical interactive ML topic — the artifact is intentionally the largest on the site (7 sections vs. the existing max of 5 for PCA) to give the topic appropriate depth.

**Scope for this session:** spec + build Neural Networks only. Naive Bayes and Text Embeddings are planned follow-on artifacts but are not part of this work.

**Accent color:** Catppuccin teal — `#179299` (Latte) / `#94e2d5` (Mocha). Unused in the current accent system; reads as "computational/neural."

## Narrative arc

Seven sections, ordered as foundations → training mechanics → culmination → coda:

| # | Section | Purpose |
|---|---------|---------|
| 1 | Anatomy of a neuron | Core primitive: weighted sum + bias + activation |
| 2 | XOR & linear separability | Why hidden layers exist |
| 3 | Activation functions & vanishing gradients | Why ReLU won |
| 4 | Backpropagation walkthrough | How the weights actually update |
| 5 | Momentum vs vanilla GD | A concrete optimizer improvement |
| 6 | Training a tiny network | Payoff — watch the concepts combine |
| 7 | Autoencoder vs PCA | Representation learning, with direct callback to `/learn/pca` |

## Section-by-section design

### 1. Anatomy of a neuron

A single neuron rendered as a canvas diagram: 3 input circles → weighted edges → summation node → activation box → output bar.

**Interactive controls:**
- Sliders for each of the 3 inputs (range −1 to 1)
- Sliders for each of the 3 weights (range −2 to 2)
- Slider for bias (range −2 to 2)
- Dropdown for activation: sigmoid / tanh / ReLU / linear

**Live updates:** edge widths scale with `|w * x|`. Summation node shows `Σ(w·x) + b`. Activation box displays the chosen curve with a moving dot at the current pre-activation value. Output bar shows final activated value.

**Teaches:** the neuron is just a weighted sum run through a nonlinearity.

### 2. XOR & linear separability

2D canvas with the four XOR points: (0,0) and (1,1) as class A, (0,1) and (1,0) as class B. User drags a linear decision boundary (line) trying to separate the classes.

**Interaction:**
- Drag two endpoints of the line. Misclassified points highlight in red.
- Toggle "Add hidden layer" — canvas splits to show two sub-neurons, each with its own draggable line. A third composite view shows the AND of the two half-planes forming the correct XOR region.

**Teaches:** single-layer perceptrons can't represent XOR; composing two linear separators with a nonlinear output layer can.

### 3. Activation functions & vanishing gradients

Side-by-side line chart with three activation curves (sigmoid, tanh, ReLU) and their derivatives plotted beneath on a shared x-axis.

**Interactive controls:**
- Slider for "depth" (1–6 stacked layers)
- Dropdown to pick which activation to stack

**Visual:** below the derivative plot, a row of bars shows the product of derivatives through the chosen depth. Sigmoid's bar shrinks geometrically (max 0.25 per layer → ~0.001 at depth 5). ReLU's stays near 1. Tanh sits between.

**Teaches:** why deep sigmoid networks train poorly and why ReLU enabled deep learning.

### 4. Backpropagation walkthrough

A static tiny 2-2-1 network diagram (2 inputs, 2 hidden neurons, 1 output). Fixed example: inputs = (0.5, 0.8), target = 1.0, initial weights shown.

**Interaction:** a `Step →` button advances through stages:
1. Forward pass: input nodes light up, then hidden nodes light up with their computed values displayed, then output.
2. Error: `(target − output)` shown, with output node glowing red proportional to error.
3. Backward pass: gradient flows backward — edges light up with `δ` values, starting from output-layer weights, then hidden-layer weights.
4. Weight update: weights animate to their new values.

Reset button returns to stage 0. Learning rate η displayed as a constant (0.5) to keep the math legible.

**Teaches:** backprop is chain-rule error assignment, nothing mystical.

### 5. Momentum vs vanilla GD

Two side-by-side 2D contour plots of the same loss landscape — a narrow ravine (elongated ellipse + optional saddle). Each shows a ball descending from the same starting point with the same learning rate.

**Interactive controls:**
- Slider for learning rate
- Slider for momentum coefficient β (applies only to the right-side ball)
- Dropdown for landscape type: `ravine`, `saddle`, `bumpy`
- Play / pause / reset

**Visual:** vanilla ball zig-zags across the ravine. Momentum ball smooths the zig-zag and reaches the minimum faster. Trails draw the paths.

**Teaches:** momentum is a running average of past gradients — damps oscillation, accelerates along consistent directions.

### 6. Training a tiny network

The payoff section. 2D dataset (toggle between `blobs`, `moons`, `circles`) and a small MLP (1 hidden layer, default 4 neurons). Canvas shows the input plane with the evolving decision boundary overlaid as a colored probability surface.

**Interactive controls:**
- Dataset toggle
- Hidden-layer width slider (2–16)
- Learning rate slider
- Activation dropdown (sigmoid / tanh / ReLU)
- Play / pause / reset — pressing play runs a training loop (~50 epochs/sec, capped)

**Side panel:** epoch counter + loss sparkline + final accuracy.

**Observables:**
- Moons requires non-trivial hidden width; 2 neurons fail, 8 succeed
- Very high LR → loss diverges; very low → crawls
- ReLU converges fastest in most cases

**Teaches:** all five prior concepts in motion. This is the section that "earns" the artifact.

### 7. Autoencoder vs PCA

Two datasets toggle: **linear blob** (elongated Gaussian) and **nonlinear** (swiss roll or concentric circles projected into 2D). Each dataset shows:

- Original points (top)
- PCA reconstruction (bottom-left)
- Autoencoder reconstruction (bottom-right) — uses a tiny 2→1→2 AE whose weights are trained client-side on mount (fast — a few hundred iterations on ~200 points takes <100ms) and cached for the session

**Interactive controls:**
- Dataset toggle
- Bottleneck size slider (1 or 2 dimensions)

**Visual:** reconstruction error (MSE) shown as a number and as residual line segments from each point to its reconstruction.

**Expected takeaway:**
- Linear data: AE ≈ PCA, nearly identical error
- Nonlinear data: PCA fails (can only pick a straight axis); AE captures the curve

**Footer of section:** inline link → *"See `/learn/pca` for the linear story in depth"* — direct cross-reference to your existing artifact.

**Teaches:** autoencoders generalize PCA; the bottleneck principle is the same.

## Architecture & implementation notes

### File additions

```
components/learn/
  neural-networks.tsx            # New — 7 sections in one component
  dynamic-artifacts.tsx          # Modify — add NeuralNetworks export
lib/learn/
  artifacts.ts                   # Modify — add 7th ARTIFACTS entry
app/learn/[slug]/
  page.tsx                       # Modify — add NeuralNetworks to dynamic-import map
```

No new shared abstractions. Follow the existing pattern: one `.tsx` file owns all 7 sections, their Canvas refs, and state.

### Source PDFs into the repo

The four exam 3 PDFs currently live in `~/Documents/MSMIS/IDS572/exam3/`. Not copying them into the repo — they're course material, not site assets. Content is pulled from them into the component directly.

### SSR strategy

Sections 5, 6, and 7 use `Math.random()` (random initial weights, dataset jitter). Following the existing pattern, this artifact loads via `components/learn/dynamic-artifacts.tsx` with `{ ssr: false }` to avoid hydration mismatches.

### Theme + reduced motion

Follow existing patterns exactly:
- `getThemeColors()` helper reads Catppuccin tokens via `getComputedStyle()`
- `MutationObserver` on `<html>` class for dark-mode re-draws
- `prefers-reduced-motion`: section 5's animation and section 6's training loop render final state instantly; others (which respond to input, not autoplay) are unaffected

### Accessibility

- Each section wrapped in `<section aria-labelledby="nn-section-{n}">`
- All sliders labeled; keyboard-operable
- Canvas-only sections include a screen-reader-only summary of the current state (e.g. "Loss: 0.23, epoch 45")
- Error boundary per existing `ArtifactErrorBoundary` pattern

### Metadata

New entry for `lib/learn/artifacts.ts`:

```ts
{
  slug: 'neural-networks',
  title: 'Neural Networks',
  shortTitle: 'Neural Networks',
  description: 'From a single neuron to a trained MLP — weights, activations, backpropagation, and why depth matters.',
  number: '07',
  subtopics: ['Neuron anatomy', 'XOR & depth', 'Activations', 'Backprop', 'Momentum', 'Training', 'Autoencoder vs PCA'],
  sectionCount: 7,
},
```

### Sitemap / JSON-LD

Auto-picked up from `ARTIFACTS` array — no extra work.

### Card illustration

Index page (`/learn`) cards are currently decorated with a minimal SVG per topic (per existing `learn-card.tsx` pattern). The NN card will get a small neuron-network sketch: 3 input nodes → 2 hidden → 1 output, with teal accent edges. Hand-authored SVG, no external library.

## Out of scope

Explicitly NOT part of this artifact:

- CNNs, RNNs, LSTMs, Transformers, attention — mentioned once in closing prose as "where this leads," not interactive
- Batch normalization, residual connections, dropout — slide material but would bloat the artifact
- R / `neuralnet` code demos from the slides
- Training on real datasets (e.g. MortgageDefaulters from the slides) — synthetic 2D is sufficient
- Backprop math derivation with chain rule — handled visually in section 4, not as equations

## Success criteria

- All 7 sections render and respond to input on desktop + mobile
- Dark/light theme correct on initial paint and on toggle
- `prefers-reduced-motion` respected in sections 5 and 6
- No hydration warnings
- Lighthouse accessibility ≥ 95 on `/learn/neural-networks`
- Sitemap, OG image, and JSON-LD auto-update from `ARTIFACTS`
- Artifact loads on cold visit in under the same budget as existing artifacts (keep bundle per artifact similar by avoiding heavy libs — no TensorFlow.js)
