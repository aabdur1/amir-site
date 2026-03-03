import type { Metadata } from 'next'
import { Hero } from "@/components/hero";
import { Certifications } from "@/components/certifications";
import { Experience } from "@/components/experience";
import { Projects } from "@/components/projects";
import { Skills } from "@/components/skills";
import { Education } from "@/components/education";
import { PageTransition } from '@/components/page-transition'
import { getAllBadges } from "@/lib/badges";

export const metadata: Metadata = {
  title: { absolute: 'Amir Abdur-Rahim — Healthcare Meets Technology' },
  description: 'Healthcare meets technology. Chicago.',
  alternates: {
    canonical: 'https://amirabdurrahim.com',
  },
  openGraph: {
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
    url: 'https://amirabdurrahim.com',
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
  },
}

export default async function Home() {
  const badges = await getAllBadges();

  return (
    <PageTransition>
      <Hero />
      <Experience />
      <Projects />
      <Certifications badges={badges} />
      <Skills />
      <Education />
    </PageTransition>
  );
}
