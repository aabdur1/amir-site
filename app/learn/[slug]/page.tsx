// app/learn/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ARTIFACTS, getArtifact, getAdjacentArtifacts } from '@/lib/learn/artifacts'
import { LearnNav } from '@/components/learn/learn-nav'
import { PageTransition } from '@/components/page-transition'
import Link from 'next/link'

import dynamic from 'next/dynamic'

// Lazy-loaded artifact components — uncomment as each is built
const GradientDescent = dynamic(() => import('@/components/learn/gradient-descent').then(m => ({ default: m.GradientDescent })))
const LogLossCrossEntropy = dynamic(() => import('@/components/learn/log-loss-cross-entropy').then(m => ({ default: m.LogLossCrossEntropy })))
const PCA = dynamic(() => import('@/components/learn/pca').then(m => ({ default: m.PCA })))
const Regularization = dynamic(() => import('@/components/learn/regularization').then(m => ({ default: m.Regularization })))
// const Clustering = dynamic(() => import('@/components/learn/clustering').then(m => ({ default: m.Clustering })))
// const SHAP = dynamic(() => import('@/components/learn/shap').then(m => ({ default: m.SHAP })))

export function generateStaticParams() {
  return ARTIFACTS.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const artifact = getArtifact(slug)
  if (!artifact) return {}

  const title = `${artifact.title} — Interactive Explainer`
  const description = artifact.description

  return {
    title,
    description,
    alternates: {
      canonical: `https://amirabdurrahim.com/learn/${slug}`,
    },
    openGraph: {
      title: `${artifact.title} — Interactive Explainer`,
      description,
      url: `https://amirabdurrahim.com/learn/${slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artifact.title} — Interactive Explainer`,
      description,
    },
  }
}

// Component map — uncomment entries as artifact components are built
// Using next/dynamic ensures each artifact is code-split per route
const ARTIFACT_COMPONENTS: Record<string, React.ComponentType> = {
  'gradient-descent': GradientDescent,
  'log-loss-cross-entropy': LogLossCrossEntropy,
  'pca': PCA,
  'regularization': Regularization,
  // 'clustering': Clustering,
  // 'shap': SHAP,
}

export default async function LearnArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const artifact = getArtifact(slug)
  if (!artifact) notFound()

  const { prev, next } = getAdjacentArtifacts(slug)
  const ArtifactComponent = ARTIFACT_COMPONENTS[slug]

  // JSON-LD LearningResource schema
  // Safe: all values are hardcoded strings from the metadata array, no user input
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: artifact.title,
    description: artifact.description,
    educationalLevel: 'Graduate',
    learningResourceType: 'Interactive simulation',
    teaches: artifact.subtopics,
    url: `https://amirabdurrahim.com/learn/${slug}`,
    author: {
      '@type': 'Person',
      name: 'Amir Abdur-Rahim',
    },
  }

  return (
    <PageTransition>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 pt-12 pb-24">
        {/* Back link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-ink-subtle dark:text-night-muted
            hover:text-mauve dark:hover:text-mauve-dark transition-colors mb-10
            font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M10 6H2M5 9L2 6l3-3" />
          </svg>
          Back to Learn
        </Link>

        {/* Artifact content */}
        {ArtifactComponent ? (
          <ArtifactComponent />
        ) : (
          <div className="text-center py-20 text-ink-subtle dark:text-night-muted">
            <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
              {artifact.number}/
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
              {artifact.title}
            </h1>
            <p className="text-[15px]">{artifact.description}</p>
            <p className="mt-4 text-[13px] text-ink-faint">Coming soon</p>
          </div>
        )}

        {/* Prev/Next navigation */}
        <LearnNav prev={prev} next={next} />
      </article>
    </PageTransition>
  )
}
