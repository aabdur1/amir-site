export interface Artifact {
  slug: string
  title: string
  shortTitle: string
  description: string
  number: string
  subtopics: string[]
  sectionCount: number
}

export const ARTIFACTS: Artifact[] = [
  {
    slug: 'gradient-descent',
    title: 'Gradient Descent',
    shortTitle: 'Gradient Descent',
    description: 'How optimization algorithms find the minimum of a loss function through iterative steps.',
    number: '01',
    subtopics: ['Loss curves', 'Learning rate', 'Batch variants', 'Gradient boosting connection'],
    sectionCount: 4,
  },
  {
    slug: 'log-loss-cross-entropy',
    title: 'Log Loss & Cross-Entropy',
    shortTitle: 'Log Loss',
    description: 'Loss functions for classification — from normality testing to the unified connection between MLE, log loss, and cross-entropy.',
    number: '02',
    subtopics: ['QQ plots', 'Log loss', 'Entropy & Gini', 'Unified connection'],
    sectionCount: 4,
  },
  {
    slug: 'pca',
    title: 'PCA / Dimensionality Reduction',
    shortTitle: 'PCA',
    description: 'How principal component analysis compresses high-dimensional data by finding directions of maximum variance.',
    number: '03',
    subtopics: ['Covariance & eigenvectors', 'Scree plots', 'Standardization', 'PC scores', 'Misconceptions'],
    sectionCount: 5,
  },
  {
    slug: 'regularization',
    title: 'Regularization / Bias-Variance',
    shortTitle: 'Regularization',
    description: 'How Ridge and Lasso penalties control model complexity by trading bias for variance.',
    number: '04',
    subtopics: ['Ridge (L2)', 'Lasso (L1)', 'Lambda tuning', 'Bias-variance tradeoff'],
    sectionCount: 2,
  },
  {
    slug: 'clustering',
    title: 'Clustering',
    shortTitle: 'Clustering',
    description: 'Three fundamental clustering algorithms and how they handle different data shapes.',
    number: '05',
    subtopics: ['K-means', 'Hierarchical', 'DBSCAN'],
    sectionCount: 3,
  },
  {
    slug: 'shap',
    title: 'SHAP / Interpretability',
    shortTitle: 'SHAP',
    description: 'How SHAP values explain individual predictions by fairly distributing credit across features.',
    number: '06',
    subtopics: ['Waterfall charts', 'Beeswarm plots', 'Global importance', 'Shapley math'],
    sectionCount: 4,
  },
  {
    slug: 'neural-networks',
    title: 'Neural Networks',
    shortTitle: 'Neural Networks',
    description: 'From a single neuron to a trained MLP — weights, activations, backpropagation, and why depth matters.',
    number: '07',
    subtopics: ['Neuron anatomy', 'XOR & depth', 'Activations', 'Backprop', 'Momentum', 'Training', 'Autoencoder vs PCA'],
    sectionCount: 7,
  },
]

export function getArtifact(slug: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.slug === slug)
}

export function getAdjacentArtifacts(slug: string): { prev: Artifact | null; next: Artifact | null } {
  const index = ARTIFACTS.findIndex((a) => a.slug === slug)
  return {
    prev: index > 0 ? ARTIFACTS[index - 1] : null,
    next: index < ARTIFACTS.length - 1 ? ARTIFACTS[index + 1] : null,
  }
}
