'use client'

import dynamic from 'next/dynamic'

// These 4 artifacts use Math.random() in useState initializers, causing
// hydration mismatches (server/client generate different random data).
// Loading them with ssr: false avoids the mismatch entirely — they're
// interactive canvas components that require JS anyway.

export const LogLossCrossEntropy = dynamic(
  () => import('./log-loss-cross-entropy').then(m => ({ default: m.LogLossCrossEntropy })),
  { ssr: false }
)

export const PCA = dynamic(
  () => import('./pca').then(m => ({ default: m.PCA })),
  { ssr: false }
)

export const Clustering = dynamic(
  () => import('./clustering').then(m => ({ default: m.Clustering })),
  { ssr: false }
)

export const SHAP = dynamic(
  () => import('./shap').then(m => ({ default: m.SHAP })),
  { ssr: false }
)

export const NeuralNetworks = dynamic(
  () => import('./neural-networks').then(m => ({ default: m.NeuralNetworks })),
  { ssr: false }
)

// SQL is ssr: false for a different reason than the ones above: its sql.js
// WebAssembly engine can only initialize in the browser.
export const SQL = dynamic(
  () => import('./sql').then(m => ({ default: m.SQL })),
  { ssr: false }
)

// Python is ssr: false for the same reason as SQL: its Pyodide engine
// (loaded from the CDN on user click) is browser-only.
export const Python = dynamic(
  () => import('./python').then(m => ({ default: m.Python })),
  { ssr: false }
)

// R is ssr: false for the same reason as SQL and Python: its webR engine
// (self-hosted, loaded on user click) is browser-only.
export const R = dynamic(
  () => import('./r').then(m => ({ default: m.R })),
  { ssr: false }
)
