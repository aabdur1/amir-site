// app/learn/page.tsx
import type { Metadata } from 'next'
import { ARTIFACTS } from '@/lib/learn/artifacts'
import { LearnCard } from '@/components/learn/learn-card'
import { PageTransition } from '@/components/page-transition'
import { SectionDivider } from '@/components/section-divider'
import { SparkRule } from '@/components/spark-rule'

export const metadata: Metadata = {
  title: 'Learn — Interactive Data Mining Explainers',
  description:
    'Interactive visual explainers for data mining concepts. Built while studying IDS 572 — gradient descent, PCA, clustering, regularization, SHAP, and more.',
  alternates: {
    canonical: 'https://amirabdurrahim.com/learn',
  },
  openGraph: {
    title: 'Learn — Interactive Data Mining Explainers',
    description:
      'Interactive visual explainers for data mining concepts like gradient descent, PCA, clustering, and SHAP.',
    url: 'https://amirabdurrahim.com/learn',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn — Interactive Data Mining Explainers',
    description: 'Interactive visual explainers for data mining concepts.',
  },
}

// SVG illustrations for each artifact card — concept-specific mini graphics.
// Solid strokes carry draw-stroke (+pathLength) and fill bars carry spark-bar
// so they draw themselves when the card's is-drawn container reveals; dashed
// strokes stay static (draw-stroke would override their dash pattern).
function GradientDescentIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <path d="M8 56 Q20 12 40 30 Q60 48 72 8" stroke="currentColor" className="text-mauve dark:text-mauve-dark draw-stroke" pathLength={100} fill="none" strokeWidth="2.5" />
      <circle cx="40" cy="30" r="4" className="fill-peach dark:fill-peach-dark" />
      <line x1="40" y1="30" x2="40" y2="16" className="stroke-peach dark:stroke-peach-dark" strokeWidth="1.5" strokeDasharray="3" />
    </svg>
  )
}

function LogLossIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <path d="M10 8 Q10 56 40 56" stroke="currentColor" className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} fill="none" strokeWidth="2.5" />
      <path d="M70 8 Q70 56 40 56" stroke="currentColor" className="text-peach dark:text-peach-dark" fill="none" strokeWidth="2.5" strokeDasharray="4" />
      <line x1="10" y1="56" x2="70" y2="56" className="stroke-ink-faint dark:stroke-night-border draw-stroke" pathLength={100} strokeWidth="1" style={{ animationDelay: '200ms' }} />
    </svg>
  )
}

function PCAIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="10" y="38" width="10" height="18" rx="2" className="fill-sapphire dark:fill-sapphire-dark spark-bar" opacity="0.8" style={{ transformBox: 'fill-box' }} />
      <rect x="24" y="18" width="10" height="38" rx="2" className="fill-mauve dark:fill-mauve-dark spark-bar" opacity="0.8" style={{ transformBox: 'fill-box', animationDelay: '70ms' }} />
      <rect x="38" y="28" width="10" height="28" rx="2" className="fill-peach dark:fill-peach-dark spark-bar" opacity="0.8" style={{ transformBox: 'fill-box', animationDelay: '140ms' }} />
      <rect x="52" y="10" width="10" height="46" rx="2" className="fill-lavender dark:fill-lavender-dark spark-bar" opacity="0.8" style={{ transformBox: 'fill-box', animationDelay: '210ms' }} />
      <line x1="8" y1="56" x2="68" y2="56" className="stroke-ink-faint dark:stroke-night-border draw-stroke" pathLength={100} strokeWidth="1" />
    </svg>
  )
}

function RegularizationIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="12" y="8" width="6" height="48" rx="3" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.25" />
      <rect x="12" y="22" width="6" height="34" rx="3" className="fill-sapphire dark:fill-sapphire-dark spark-bar" style={{ transformBox: 'fill-box' }} />
      <rect x="26" y="8" width="6" height="48" rx="3" className="fill-mauve dark:fill-mauve-dark" opacity="0.25" />
      <rect x="26" y="30" width="6" height="26" rx="3" className="fill-mauve dark:fill-mauve-dark spark-bar" style={{ transformBox: 'fill-box', animationDelay: '70ms' }} />
      <rect x="40" y="8" width="6" height="48" rx="3" className="fill-peach dark:fill-peach-dark" opacity="0.25" />
      <rect x="40" y="42" width="6" height="14" rx="3" className="fill-peach dark:fill-peach-dark spark-bar" style={{ transformBox: 'fill-box', animationDelay: '140ms' }} />
      <rect x="54" y="8" width="6" height="48" rx="3" className="fill-lavender dark:fill-lavender-dark" opacity="0.25" />
      <rect x="54" y="50" width="6" height="6" rx="3" className="fill-lavender dark:fill-lavender-dark spark-bar" style={{ transformBox: 'fill-box', animationDelay: '210ms' }} />
    </svg>
  )
}

function ClusteringIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <circle cx="22" cy="20" r="8" fill="none" className="stroke-sapphire dark:stroke-sapphire-dark draw-stroke" pathLength={100} strokeWidth="1.5" />
      <circle cx="22" cy="20" r="2.5" className="fill-sapphire dark:fill-sapphire-dark" />
      <circle cx="56" cy="38" r="8" fill="none" className="stroke-peach dark:stroke-peach-dark draw-stroke" pathLength={100} strokeWidth="1.5" style={{ animationDelay: '120ms' }} />
      <circle cx="56" cy="38" r="2.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="40" cy="50" r="6" fill="none" className="stroke-mauve dark:stroke-mauve-dark draw-stroke" pathLength={100} strokeWidth="1.5" style={{ animationDelay: '240ms' }} />
      <circle cx="40" cy="50" r="2" className="fill-mauve dark:fill-mauve-dark" />
    </svg>
  )
}

function SHAPIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {/* Waterfall bars */}
      <rect x="12" y="12" width="22" height="8" rx="1" className="fill-sapphire dark:fill-sapphire-dark spark-bar" style={{ transformBox: 'fill-box' }} />
      <rect x="38" y="12" width="14" height="8" rx="1" className="fill-peach dark:fill-peach-dark spark-bar" opacity="0.7" style={{ transformBox: 'fill-box', animationDelay: '60ms' }} />
      <rect x="12" y="26" width="30" height="8" rx="1" className="fill-sapphire dark:fill-sapphire-dark spark-bar" opacity="0.6" style={{ transformBox: 'fill-box', animationDelay: '120ms' }} />
      <rect x="12" y="40" width="18" height="8" rx="1" className="fill-peach dark:fill-peach-dark spark-bar" style={{ transformBox: 'fill-box', animationDelay: '180ms' }} />
      <rect x="12" y="54" width="40" height="4" rx="1" className="fill-mauve dark:fill-mauve-dark spark-bar" style={{ transformBox: 'fill-box', animationDelay: '240ms' }} />
    </svg>
  )
}

function NeuralNetworksIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {/* Edges */}
      <g className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2">
        <line className="draw-stroke" pathLength={100} x1="16" y1="14" x2="40" y2="22" />
        <line className="draw-stroke" pathLength={100} x1="16" y1="32" x2="40" y2="22" style={{ animationDelay: '60ms' }} />
        <line className="draw-stroke" pathLength={100} x1="16" y1="50" x2="40" y2="22" style={{ animationDelay: '120ms' }} />
        <line className="draw-stroke" pathLength={100} x1="16" y1="14" x2="40" y2="44" style={{ animationDelay: '60ms' }} />
        <line className="draw-stroke" pathLength={100} x1="16" y1="32" x2="40" y2="44" style={{ animationDelay: '120ms' }} />
        <line className="draw-stroke" pathLength={100} x1="16" y1="50" x2="40" y2="44" style={{ animationDelay: '180ms' }} />
        <line className="draw-stroke" pathLength={100} x1="40" y1="22" x2="64" y2="32" style={{ animationDelay: '240ms' }} />
        <line className="draw-stroke" pathLength={100} x1="40" y1="44" x2="64" y2="32" style={{ animationDelay: '300ms' }} />
      </g>
      {/* Input, hidden, output nodes */}
      <circle cx="16" cy="14" r="4" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.85" />
      <circle cx="16" cy="32" r="4" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.85" />
      <circle cx="16" cy="50" r="4" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.85" />
      <circle cx="40" cy="22" r="4.5" className="fill-teal dark:fill-teal-dark" />
      <circle cx="40" cy="44" r="4.5" className="fill-teal dark:fill-teal-dark" />
      <circle cx="64" cy="32" r="4.5" className="fill-peach dark:fill-peach-dark" />
    </svg>
  )
}

const ILLUSTRATIONS: Record<string, () => React.JSX.Element> = {
  'gradient-descent': GradientDescentIllustration,
  'log-loss-cross-entropy': LogLossIllustration,
  'pca': PCAIllustration,
  'regularization': RegularizationIllustration,
  'clustering': ClusteringIllustration,
  'shap': SHAPIllustration,
  'neural-networks': NeuralNetworksIllustration,
}

export default function LearnPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 pt-20 pb-24">
        {/* Ornamental divider */}
        <SectionDivider color="peach" absolute={false} />

        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase text-mauve dark:text-mauve-dark mb-4">
            Interactive Explainers
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-ink dark:text-night-text mb-4">
            Data Mining Concepts
          </h1>
          <p className="text-ink-subtle dark:text-night-muted text-[15px] max-w-xl mx-auto mb-6">
            Built while studying IDS 572 — interactive tools for understanding machine learning fundamentals
          </p>
          <div className="flex justify-center">
            {/* Gradient-descent loss curve — the section's own subject matter */}
            <SparkRule data={[7, 4, 2.6, 1.9, 1.5, 1.3, 1.2]} variant="line" visible delay={350} />
          </div>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {ARTIFACTS.map((artifact, i) => {
            const Illustration = ILLUSTRATIONS[artifact.slug]
            return (
              <LearnCard
                key={artifact.slug}
                artifact={artifact}
                index={i}
                illustration={Illustration ? <Illustration /> : null}
              />
            )
          })}
        </div>
      </section>
    </PageTransition>
  )
}
