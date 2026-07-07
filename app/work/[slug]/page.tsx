// app/work/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CASE_STUDIES, getCaseStudy, getAdjacentCaseStudies } from '@/lib/work/case-studies'
import { CaseStudyArticle } from '@/components/work/case-study-article'
import { WorkNav } from '@/components/work/work-nav'
import { PageTransition } from '@/components/page-transition'

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) return {}

  const title = `${study.title} — Case Study`
  const description = study.summary

  return {
    title,
    description,
    alternates: {
      canonical: `https://amirabdurrahim.com/work/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://amirabdurrahim.com/work/${slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const study = getCaseStudy(slug)
  if (!study) notFound()

  const { prev, next } = getAdjacentCaseStudies(slug)

  // JSON-LD CreativeWork schema
  // Safe: all values are hardcoded strings from the metadata array, no user input
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: study.title,
    description: study.summary,
    url: `https://amirabdurrahim.com/work/${slug}`,
    author: {
      '@type': 'Person',
      name: 'Amir Abdur-Rahim',
    },
    keywords: study.tech.join(', '),
  }

  // JSON-LD BreadcrumbList schema — same hardcoded-values safety as above
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://amirabdurrahim.com' },
      { '@type': 'ListItem', position: 2, name: 'Work', item: 'https://amirabdurrahim.com/work' },
      { '@type': 'ListItem', position: 3, name: study.title, item: `https://amirabdurrahim.com/work/${slug}` },
    ],
  }

  return (
    <PageTransition>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <article className="relative pt-12 pb-24">
        {/* Back link */}
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
          <Link
            href="/work"
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
            Back to Work
          </Link>
        </div>

        <CaseStudyArticle study={study} />

        {/* Prev/next — hidden entirely while there is a single case study */}
        {(prev || next) && (
          <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
            <WorkNav prev={prev} next={next} />
          </div>
        )}
      </article>
    </PageTransition>
  )
}
