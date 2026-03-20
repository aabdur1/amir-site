// app/learn/page.tsx
import type { Metadata } from 'next'
import { ARTIFACTS } from '@/lib/learn/artifacts'
import { LearnCard } from '@/components/learn/learn-card'
import { PageTransition } from '@/components/page-transition'
import { SectionDivider } from '@/components/section-divider'

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

// SVG illustrations for each artifact card — concept-specific mini graphics
function GradientDescentIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <path d="M8 56 Q20 12 40 30 Q60 48 72 8" stroke="currentColor" className="text-mauve dark:text-mauve-dark" fill="none" strokeWidth="2.5" />
      <circle cx="40" cy="30" r="4" className="fill-peach dark:fill-peach-dark" />
      <line x1="40" y1="30" x2="40" y2="16" className="stroke-peach dark:stroke-peach-dark" strokeWidth="1.5" strokeDasharray="3" />
    </svg>
  )
}

function LogLossIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <path d="M10 8 Q10 56 40 56" stroke="currentColor" className="text-sapphire dark:text-sapphire-dark" fill="none" strokeWidth="2.5" />
      <path d="M70 8 Q70 56 40 56" stroke="currentColor" className="text-peach dark:text-peach-dark" fill="none" strokeWidth="2.5" strokeDasharray="4" />
      <line x1="10" y1="56" x2="70" y2="56" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
    </svg>
  )
}

function PCAIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="10" y="38" width="10" height="18" rx="2" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.8" />
      <rect x="24" y="18" width="10" height="38" rx="2" className="fill-mauve dark:fill-mauve-dark" opacity="0.8" />
      <rect x="38" y="28" width="10" height="28" rx="2" className="fill-peach dark:fill-peach-dark" opacity="0.8" />
      <rect x="52" y="10" width="10" height="46" rx="2" className="fill-lavender dark:fill-lavender-dark" opacity="0.8" />
      <line x1="8" y1="56" x2="68" y2="56" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1" />
    </svg>
  )
}

function RegularizationIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="12" y="8" width="6" height="48" rx="3" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.25" />
      <rect x="12" y="22" width="6" height="34" rx="3" className="fill-sapphire dark:fill-sapphire-dark" />
      <rect x="26" y="8" width="6" height="48" rx="3" className="fill-mauve dark:fill-mauve-dark" opacity="0.25" />
      <rect x="26" y="30" width="6" height="26" rx="3" className="fill-mauve dark:fill-mauve-dark" />
      <rect x="40" y="8" width="6" height="48" rx="3" className="fill-peach dark:fill-peach-dark" opacity="0.25" />
      <rect x="40" y="42" width="6" height="14" rx="3" className="fill-peach dark:fill-peach-dark" />
      <rect x="54" y="8" width="6" height="48" rx="3" className="fill-lavender dark:fill-lavender-dark" opacity="0.25" />
      <rect x="54" y="50" width="6" height="6" rx="3" className="fill-lavender dark:fill-lavender-dark" />
    </svg>
  )
}

function ClusteringIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <circle cx="22" cy="20" r="8" fill="none" className="stroke-sapphire dark:stroke-sapphire-dark" strokeWidth="1.5" />
      <circle cx="22" cy="20" r="2.5" className="fill-sapphire dark:fill-sapphire-dark" />
      <circle cx="56" cy="38" r="8" fill="none" className="stroke-peach dark:stroke-peach-dark" strokeWidth="1.5" />
      <circle cx="56" cy="38" r="2.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="40" cy="50" r="6" fill="none" className="stroke-mauve dark:stroke-mauve-dark" strokeWidth="1.5" />
      <circle cx="40" cy="50" r="2" className="fill-mauve dark:fill-mauve-dark" />
    </svg>
  )
}

function SHAPIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {/* Waterfall bars */}
      <rect x="12" y="12" width="22" height="8" rx="1" className="fill-sapphire dark:fill-sapphire-dark" />
      <rect x="38" y="12" width="14" height="8" rx="1" className="fill-peach dark:fill-peach-dark" opacity="0.7" />
      <rect x="12" y="26" width="30" height="8" rx="1" className="fill-sapphire dark:fill-sapphire-dark" opacity="0.6" />
      <rect x="12" y="40" width="18" height="8" rx="1" className="fill-peach dark:fill-peach-dark" />
      <rect x="12" y="54" width="40" height="4" rx="1" className="fill-mauve dark:fill-mauve-dark" />
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
          <div className="h-px w-12 bg-mauve dark:bg-mauve-dark mx-auto"
            style={{ animation: 'line-grow 0.8s ease-out 0.3s forwards', transform: 'scaleX(0)', transformOrigin: 'center' }} />
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
