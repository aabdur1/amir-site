'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { Photo } from '@/lib/types'
import { PhotoCard } from './photo-card'
import { SortControls } from './sort-controls'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type SortBy = 'shuffle' | 'date' | 'camera' | 'lens'

const CAMERA_BRANDS: Record<string, string> = {
  ILCE: 'Sony',
  NIKON: 'Nikon',
  FUJIFILM: 'Fujifilm',
  X100: 'Fujifilm',
  'X-T': 'Fujifilm',
  'X-S': 'Fujifilm',
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

const BATCH_SIZE = 12

export function MasonryGrid({ photos }: { photos: Photo[] }) {
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const shuffledRef = useRef<Photo[]>([])
  if (shuffledRef.current.length !== photos.length) {
    shuffledRef.current = shuffle(photos)
  }

  const displayPhotos = useMemo(() => {
    if (sortBy === 'shuffle') return shuffledRef.current
    return [...photos].sort((a, b) => {
      if (sortBy === 'date') return b.date.localeCompare(a.date)
      if (sortBy === 'camera') return a.camera.localeCompare(b.camera)
      if (sortBy === 'lens') return a.lens.localeCompare(b.lens)
      return 0
    })
  }, [photos, sortBy])

  // Reset visible count when sort changes; re-shuffle when shuffle is selected
  useEffect(() => {
    if (sortBy === 'shuffle') {
      shuffledRef.current = shuffle(photos)
    }
    setVisibleCount(BATCH_SIZE)
  }, [sortBy, photos])

  // Infinite scroll — load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, displayPhotos.length))
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [displayPhotos.length])

  const visiblePhotos = displayPhotos.slice(0, visibleCount)

  const photoByUrl = useMemo(
    () => Object.fromEntries(displayPhotos.map(p => [p.url, p])),
    [displayPhotos]
  )

  const slides = useMemo(
    () => displayPhotos.map((photo) => ({
      src: photo.url,
      alt: `Photograph by Amir Abdur-Rahim, ${photo.date} — ${photo.camera}, ${photo.lens}`,
    })),
    [displayPhotos]
  )

  const openLightbox = useCallback((index: number) => {
    const open = () => {
      setLightboxIndex(index)
      setLightboxOpen(true)
    }

    if (document.startViewTransition) {
      document.startViewTransition(open)
    } else {
      open()
    }
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    // Clear view-transition-name from all photo wrappers
    document.querySelectorAll('[style*="view-transition-name"]').forEach(el => {
      (el as HTMLElement).style.viewTransitionName = ''
    })
  }, [])

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      {/* Header area */}
      <div className="px-6 pt-24 pb-12 max-w-7xl mx-auto">
        <div className="flex flex-col items-center">
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
            text-ink-subtle dark:text-night-muted mb-4">
            Portfolio
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-[family-name:var(--font-display)] text-ink dark:text-night-text text-center">
            Photography
          </h1>
          <div className="mt-4 h-px w-16 bg-mauve dark:bg-mauve-dark" />
          <p className="mt-5 text-sm text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[250px] sm:auto-rows-[300px]">
          {visiblePhotos.map((photo, i) => (
            <PhotoCard
              key={photo.url}
              photo={photo}
              index={i}
              onClick={() => openLightbox(i)}
            />
          ))}
        </div>
        {/* Sentinel for infinite scroll */}
        {visibleCount < displayPhotos.length && (
          <div ref={sentinelRef} className="h-px" />
        )}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={closeLightbox}
        index={lightboxIndex}
        slides={slides}
        plugins={[Zoom]}
        render={{
          slideFooter: ({ slide }) => {
            const photo = photoByUrl[slide.src]
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
