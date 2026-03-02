'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { Photo } from '@/lib/types'
import { PhotoCard } from './photo-card'
import { SortControls } from './sort-controls'

type SortBy = 'date' | 'camera' | 'lens'

const CAMERA_BRANDS: Record<string, string> = {
  ILCE: 'Sony',
  NIKON: 'Nikon',
  'FUJIFILM': 'Fujifilm',
}

function deriveBrands(photos: Photo[]): string {
  const brands = new Set<string>()
  for (const p of photos) {
    const model = p.camera.toUpperCase()
    for (const [prefix, brand] of Object.entries(CAMERA_BRANDS)) {
      if (model.startsWith(prefix)) { brands.add(brand); break }
    }
  }
  const arr = [...brands].sort()
  return arr.length > 0 ? arr.join(' + ') : 'Various'
}

function CountUp({ target }: { target: number }) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  const animate = useCallback(() => {
    if (!spanRef.current || hasAnimated.current) return
    hasAnimated.current = true

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      spanRef.current.textContent = String(target)
      return
    }

    const duration = 1200
    const start = performance.now()
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const value = Math.round(easeOut(progress) * target)
      if (spanRef.current) spanRef.current.textContent = String(value)
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [target])

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate()
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animate])

  return <span ref={spanRef}>0</span>
}

export function MasonryGrid({ photos }: { photos: Photo[] }) {
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const sortedPhotos = [...photos].sort((a, b) => {
    if (sortBy === 'date') return b.date.localeCompare(a.date) // newest first
    if (sortBy === 'camera') return a.camera.localeCompare(b.camera)
    if (sortBy === 'lens') return a.lens.localeCompare(b.lens)
    return 0
  })

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      {/* Header area */}
      <div className="px-6 pt-24 pb-12 max-w-7xl mx-auto">
        <div className="flex flex-col items-center">
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
            text-ink-muted dark:text-night-muted mb-4">
            Portfolio
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-[family-name:var(--font-display)] text-ink dark:text-night-text text-center">
            Photography
          </h1>
          <div className="mt-4 h-px w-16 bg-mauve dark:bg-mauve-dark" />
          <p className="mt-5 text-sm text-ink-muted dark:text-night-muted font-[family-name:var(--font-mono)]">
            <CountUp target={photos.length} /> images <span className="text-peach dark:text-peach-dark">&middot;</span> {deriveBrands(photos)}
          </p>
        </div>
        {/* Sort controls */}
        <div className="mt-8 flex justify-center sm:justify-end">
          <SortControls value={sortBy} onChange={(v) => { setSortBy(v as SortBy); setLightboxOpen(false) }} />
        </div>
      </div>

      {/* Masonry grid */}
      <div className="px-4 sm:px-6 pb-16 max-w-7xl mx-auto">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {sortedPhotos.map((photo, i) => (
            <PhotoCard
              key={photo.url}
              photo={photo}
              index={i}
              onClick={() => {
                setLightboxIndex(i)
                setLightboxOpen(true)
              }}
            />
          ))}
        </div>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={sortedPhotos.map((photo) => ({ src: photo.url }))}
        plugins={[Zoom]}
        render={{
          slideFooter: ({ slide }) => {
            const photo = sortedPhotos.find(p => p.url === slide.src)
            if (!photo) return null
            return (
              <div className="text-center py-3 px-4 text-xs sm:text-sm text-white/70 font-[family-name:var(--font-body)] flex flex-wrap justify-center gap-x-2 gap-y-1">
                <span>{photo.date}</span>
                <span className="hidden sm:inline">&middot;</span>
                <span>{photo.camera}</span>
                <span className="hidden sm:inline">&middot;</span>
                <span>{photo.lens}</span>
              </div>
            )
          }
        }}
      />
    </div>
  )
}
