export interface ArtifactSection {
  id: string // matches the h2 id inside the artifact component
  label: string // short rail label — keep ≤ 13 chars so it fits the xl margin
}

export interface Artifact {
  slug: string
  title: string
  shortTitle: string
  description: string
  number: string
  subtopics: string[]
  sectionCount: number
  sections: ArtifactSection[]
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
    sections: [
      { id: 'gd-why-gradients', label: 'Why gradients' },
      { id: 'gd-learning-rate', label: 'Learning rate' },
      { id: 'gd-batch-variants', label: 'Batch vs SGD' },
      { id: 'gd-vs-boosting', label: 'vs Boosting' },
    ],
  },
  {
    slug: 'log-loss-cross-entropy',
    title: 'Log Loss & Cross-Entropy',
    shortTitle: 'Log Loss',
    description: 'Loss functions for classification — from normality testing to the unified connection between MLE, log loss, and cross-entropy.',
    number: '02',
    subtopics: ['QQ plots', 'Log loss', 'Entropy & Gini', 'Unified connection'],
    sectionCount: 4,
    sections: [
      { id: 'll-qq-plots', label: 'QQ plots' },
      { id: 'll-log-loss', label: 'Log loss' },
      { id: 'll-entropy-gini', label: 'Entropy/Gini' },
      { id: 'll-unified-connection', label: 'Connection' },
    ],
  },
  {
    slug: 'pca',
    title: 'PCA / Dimensionality Reduction',
    shortTitle: 'PCA',
    description: 'How principal component analysis compresses high-dimensional data by finding directions of maximum variance.',
    number: '03',
    subtopics: ['Covariance & eigenvectors', 'Scree plots', 'Standardization', 'PC scores', 'Misconceptions'],
    sectionCount: 5,
    sections: [
      { id: 'pca-what-finds', label: 'What it finds' },
      { id: 'pca-how-many', label: 'How many PCs' },
      { id: 'pca-standardize', label: 'Standardize' },
      { id: 'pca-score-calc', label: 'PC scores' },
      { id: 'pca-recipes', label: 'Recipes' },
    ],
  },
  {
    slug: 'regularization',
    title: 'Regularization / Bias-Variance',
    shortTitle: 'Regularization',
    description: 'How Ridge and Lasso penalties control model complexity by trading bias for variance.',
    number: '04',
    subtopics: ['Ridge (L2)', 'Lasso (L1)', 'Lambda tuning', 'Bias-variance tradeoff'],
    sectionCount: 2,
    sections: [
      { id: 'reg-shrinkage', label: 'Shrinkage' },
      { id: 'reg-bias-variance', label: 'Bias-variance' },
    ],
  },
  {
    slug: 'clustering',
    title: 'Clustering',
    shortTitle: 'Clustering',
    description: 'Three fundamental clustering algorithms and how they handle different data shapes.',
    number: '05',
    subtopics: ['K-means', 'Hierarchical', 'DBSCAN'],
    sectionCount: 3,
    sections: [
      { id: 'cl-kmeans', label: 'K-means' },
      { id: 'cl-hierarchical', label: 'Hierarchical' },
      { id: 'cl-dbscan', label: 'DBSCAN' },
    ],
  },
  {
    slug: 'shap',
    title: 'SHAP / Interpretability',
    shortTitle: 'SHAP',
    description: 'How SHAP values explain individual predictions by fairly distributing credit across features.',
    number: '06',
    subtopics: ['Waterfall charts', 'Beeswarm plots', 'Global importance', 'Shapley math'],
    sectionCount: 4,
    sections: [
      { id: 'shap-waterfall', label: 'Waterfall' },
      { id: 'shap-beeswarm', label: 'Beeswarm' },
      { id: 'shap-global', label: 'Importance' },
      { id: 'shap-math', label: 'Shapley math' },
    ],
  },
  {
    slug: 'neural-networks',
    title: 'Neural Networks',
    shortTitle: 'Neural Networks',
    description: 'From a single neuron to a trained MLP — weights, activations, backpropagation, and why depth matters.',
    number: '07',
    subtopics: ['Neuron anatomy', 'XOR & depth', 'Activations', 'Backprop', 'Momentum', 'Training', 'Autoencoder vs PCA'],
    sectionCount: 7,
    sections: [
      { id: 'nn-section-1', label: 'Neuron' },
      { id: 'nn-section-2', label: 'XOR & depth' },
      { id: 'nn-section-3', label: 'Activations' },
      { id: 'nn-section-4', label: 'Backprop' },
      { id: 'nn-section-5', label: 'Momentum' },
      { id: 'nn-section-6', label: 'Training' },
      { id: 'nn-section-7', label: 'AE vs PCA' },
    ],
  },
  {
    slug: 'sql',
    title: 'SQL / Querying Data',
    shortTitle: 'SQL',
    description: 'Run real SQL against a synthetic patient dataset — SQLite compiled to WebAssembly, with checked exercises from SELECT to window functions.',
    number: '08',
    subtopics: ['SELECT & filtering', 'Aggregation', 'Joins', 'Window functions'],
    sectionCount: 4,
    sections: [
      { id: 'sql-select', label: 'SELECT' },
      { id: 'sql-aggregate', label: 'Aggregation' },
      { id: 'sql-joins', label: 'Joins' },
      { id: 'sql-windows', label: 'Windows' },
    ],
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
