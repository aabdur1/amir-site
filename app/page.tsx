import type { Metadata } from 'next'
import { Hero } from "@/components/hero";
import { Certifications } from "@/components/certifications";
import { Experience } from "@/components/experience";
import { Projects } from "@/components/projects";
import { Skills } from "@/components/skills";
import { Education } from "@/components/education";
import { LearnTeaser } from "@/components/learn-teaser";
import { PageTransition } from '@/components/page-transition'
import { Spine } from '@/components/spine'
import { getAllBadges } from "@/lib/badges";

export const metadata: Metadata = {
  title: { absolute: 'Amir Abdur-Rahim — Healthcare Data Analyst' },
  description: 'Turning clinical data into decisions. Chicago.',
  alternates: {
    canonical: 'https://amirabdurrahim.com',
  },
  openGraph: {
    title: 'Amir Abdur-Rahim',
    description: 'Turning clinical data into decisions. Chicago.',
    url: 'https://amirabdurrahim.com',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amir Abdur-Rahim',
    description: 'Turning clinical data into decisions. Chicago.',
  },
}

export default async function Home() {
  const badges = await getAllBadges();

  return (
    <PageTransition>
      <div className="relative">
        <Spine />
        <Hero />
        <Experience />
        <Projects />
        <Certifications badges={badges} />
        <Skills />
        <Education />
        <LearnTeaser />
      </div>
    </PageTransition>
  );
}
