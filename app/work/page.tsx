// app/work/page.tsx
import type { Metadata } from 'next'
import { CASE_STUDIES } from '@/lib/work/case-studies'
import { WorkCard } from '@/components/work/work-card'
import { PageTransition } from '@/components/page-transition'
import { SectionDivider } from '@/components/section-divider'
import { SparkRule } from '@/components/spark-rule'

export const metadata: Metadata = {
  title: 'Work — Case Studies',
  description:
    'Case studies of selected projects — the data, the approach, and what the analysis actually showed. Currently featuring a Tableau story on US airline flight patterns.',
  alternates: {
    canonical: 'https://amirabdurrahim.com/work',
  },
  openGraph: {
    title: 'Work — Case Studies',
    description:
      'Case studies of selected projects — the data, the approach, and what the analysis actually showed.',
    url: 'https://amirabdurrahim.com/work',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work — Case Studies',
    description: 'Case studies of selected projects.',
  },
}

export default function WorkPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 pt-20 pb-24">
        <SectionDivider color="peach" absolute={false} />

        <div className="text-center mb-16">
          <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase text-mauve dark:text-mauve-dark mb-4">
            Case Studies
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-ink dark:text-night-text mb-4">
            Work
          </h1>
          <p className="text-ink-subtle dark:text-night-muted text-[15px] max-w-xl mx-auto mb-6">
            Deep dives into selected projects — the data, the approach, and what the analysis
            actually showed
          </p>
          <div className="flex justify-center">
            {/* Rising step — a body of work accumulating */}
            <SparkRule data={[1, 1, 2, 3, 3, 4, 5]} variant="step" visible delay={350} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CASE_STUDIES.map((study, i) => (
            <WorkCard key={study.slug} study={study} index={i} />
          ))}
        </div>
      </section>
    </PageTransition>
  )
}
