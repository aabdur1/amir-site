import type { Metadata } from 'next'
import { Hero } from "@/components/hero";
import { Certifications } from "@/components/certifications";
import { PageTransition } from '@/components/page-transition'
import { getAllBadges } from "@/lib/badges";

export const metadata: Metadata = {
  title: 'Amir Abdur-Rahim — Healthcare Meets Technology',
  description: 'Personal site of Amir Abdur-Rahim. MS in MIS at UIC, 1st Place AWS National Cloud Quest, Zscaler Zero Trust Architect. Chicago.',
  openGraph: {
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
    url: 'https://amirabdurrahim.com',
    type: 'website',
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
      <Certifications badges={badges} />
    </PageTransition>
  );
}
