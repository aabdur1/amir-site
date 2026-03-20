import type { MetadataRoute } from 'next'
import { ARTIFACTS } from '@/lib/learn/artifacts'

export default function sitemap(): MetadataRoute.Sitemap {
  const learnPages = ARTIFACTS.map((a) => ({
    url: `https://amirabdurrahim.com/learn/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: 'https://amirabdurrahim.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://amirabdurrahim.com/gallery',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://amirabdurrahim.com/learn',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...learnPages,
  ]
}
