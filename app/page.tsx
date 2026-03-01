import type { Metadata } from 'next'
import { Hero } from "@/components/hero";
import { Badges } from "@/components/badges";
import { PageTransition } from '@/components/page-transition'

export const metadata: Metadata = {
  title: 'Amir Abdur-Rahim — Healthcare Meets Technology',
  description: 'Personal site of Amir Abdur-Rahim. MS in MIS at UIC, 1st Place AWS National Cloud Quest, Zscaler Zero Trust Architect. Chicago.',
  openGraph: {
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
    url: 'https://amirabdurrahim.com',
    type: 'website',
    images: ['https://amirabdurrahim-photos.s3.us-east-2.amazonaws.com/_DSC4482.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amir Abdur-Rahim',
    description: 'Healthcare meets technology. Chicago.',
    images: ['https://amirabdurrahim-photos.s3.us-east-2.amazonaws.com/_DSC4482.jpg'],
  },
}

export default function Home() {
  return (
    <PageTransition>
      <Hero />
      <Badges />
    </PageTransition>
  );
}
