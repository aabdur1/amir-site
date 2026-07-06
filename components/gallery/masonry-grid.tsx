'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { Photo } from '@/lib/types'
import { PhotoCard } from './photo-card'
import { SortControls } from './sort-controls'
import { SparkRule } from '@/components/spark-rule'

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

function brandFor(camera: string): string | null {
  const upper = camera.toUpperCase()
  for (const [prefix, brand] of Object.entries(CAMERA_BRANDS)) {
    if (upper.startsWith(prefix)) return brand
  }
  return null
}

function cameraLabel(camera: string): string {
  const brand = brandFor(camera)
  return brand ? `${brand} ${camera}` : camera
}

type Group = { key: string; label: string; photos: Photo[] }

function buildGroups(photos: Photo[], sortBy: 'camera' | 'lens'): Group[] {
  const map = new Map<string, Photo[]>()
  for (const p of photos) {
    const key = sortBy === 'camera' ? p.camera : p.lens
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries()).map(([key, groupPhotos]) => ({
    key,
    label: sortBy === 'camera' ? cameraLabel(key) : key,
    photos: groupPhotos,
  }))
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

  // Animated digits are hidden from AT; sr-only span carries the real count
  return (
    <>
      <span ref={spanRef} aria-hidden="true">0</span>
      <span className="sr-only">{target}</span>
    </>
  )
}

const BATCH_SIZE = 12

export function MasonryGrid({ photos }: { photos: Photo[] }) {
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null)

  const [shuffled, setShuffled] = useState<Photo[]>(() => shuffle(photos))

  const displayPhotos = useMemo(() => {
    if (sortBy === 'shuffle') return shuffled
    return [...photos].sort((a, b) => {
      if (sortBy === 'date') return b.date.localeCompare(a.date)
      if (sortBy === 'camera') return a.camera.localeCompare(b.camera)
      if (sortBy === 'lens') return a.lens.localeCompare(b.lens)
      return 0
    })
  }, [photos, sortBy, shuffled])

  // Reset visible count when sort changes; re-shuffle when shuffle is selected
  useEffect(() => {
    if (sortBy === 'shuffle') {
      setShuffled(shuffle(photos))
    }
    setVisibleCount(BATCH_SIZE)
  }, [sortBy, photos])

  // Infinite scroll — re-attach observer whenever the sentinel mounts/unmounts
  useEffect(() => {
    if (!sentinelEl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, displayPhotos.length))
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelEl)
    return () => observer.disconnect()
  }, [sentinelEl, displayPhotos.length])

  const visiblePhotos = displayPhotos.slice(0, visibleCount)

  // When sorting by camera or lens, slice the visible photos into labeled groups
  const visibleGroups = useMemo<Group[] | null>(() => {
    if (sortBy !== 'camera' && sortBy !== 'lens') return null
    return buildGroups(visiblePhotos, sortBy)
  }, [visiblePhotos, sortBy])

  // Total counts per group (used in header to show e.g. "5 / 18 photos")
  const totalCountByKey = useMemo<Record<string, number>>(() => {
    if (sortBy !== 'camera' && sortBy !== 'lens') return {}
    const counts: Record<string, number> = {}
    for (const p of displayPhotos) {
      const key = sortBy === 'camera' ? p.camera : p.lens
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [displayPhotos, sortBy])

  const photoIndexByUrl = useMemo(
    () => Object.fromEntries(displayPhotos.map((p, i) => [p.url, i])),
    [displayPhotos]
  )

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
          <div className="mt-4">
            <SparkRule data={[2, 5, 3, 6, 4, 7, 6, 8]} variant="line" visible delay={400} />
          </div>
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
        {visibleGroups ? (
          visibleGroups.map((group, gi) => (
            <section
              key={group.key}
              aria-label={`${group.label}, ${totalCountByKey[group.key]} photos`}
              className={gi === 0 ? '' : 'mt-14 sm:mt-16'}
            >
              <header className="mb-6 flex items-baseline gap-3 flex-wrap">
                <span aria-hidden="true" className="text-peach dark:text-peach-dark font-[family-name:var(--font-mono)] text-xs sm:text-sm">
                  {String(gi + 1).padStart(2, '0')} /
                </span>
                <h2 className="text-sm sm:text-base tracking-[0.2em] uppercase font-[family-name:var(--font-mono)] text-ink dark:text-night-text">
                  {group.label}
                </h2>
                <span aria-hidden="true" className="text-peach/60 dark:text-peach-dark/60">◇</span>
                <span className="text-xs font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted">
                  {group.photos.length === totalCountByKey[group.key]
                    ? `${group.photos.length} ${group.photos.length === 1 ? 'photo' : 'photos'}`
                    : `${group.photos.length} of ${totalCountByKey[group.key]}`}
                </span>
                <div className="flex-1 h-px bg-cream-border/60 dark:bg-night-border/60 ml-2" />
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[250px] sm:auto-rows-[300px]">
                {group.photos.map((photo, i) => (
                  <PhotoCard
                    key={photo.url}
                    photo={photo}
                    index={i}
                    onClick={() => openLightbox(photoIndexByUrl[photo.url])}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-[250px] sm:auto-rows-[300px]">
            {visiblePhotos.map((photo, i) => (
              <PhotoCard
                key={photo.url}
                photo={photo}
                index={i}
                onClick={() => openLightbox(photoIndexByUrl[photo.url])}
              />
            ))}
          </div>
        )}
        {/* Sentinel for infinite scroll */}
        {visibleCount < displayPhotos.length && (
          <div ref={setSentinelEl} className="h-px" />
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
