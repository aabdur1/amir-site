import type { Metadata } from 'next'
import photosData from '@/public/photos.json'
import { MasonryGrid } from '@/components/gallery/masonry-grid'
import { PageTransition } from '@/components/page-transition'
import type { Photo } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Photography',
  description:
    'Photography portfolio by Amir Abdur-Rahim. Landscape and street photography from Chicago and beyond.',
  alternates: {
    canonical: 'https://amirabdurrahim.com/gallery',
  },
  openGraph: {
    title: 'Photography — Amir Abdur-Rahim',
    description:
      'Photography portfolio featuring landscape and street work.',
    url: 'https://amirabdurrahim.com/gallery',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Photography — Amir Abdur-Rahim',
    description: 'Photography portfolio featuring landscape and street work.',
  },
}

const photos: Photo[] = photosData

export default function GalleryPage() {
  return (
    <PageTransition>
      <MasonryGrid photos={photos} />
    </PageTransition>
  )
}
