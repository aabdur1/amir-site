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
