'use client'

import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { Photo } from '@/lib/types'
import { PhotoCard } from './photo-card'

type SortBy = 'date' | 'camera' | 'lens'

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
      <div className="px-6 pt-24 pb-8 max-w-7xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-[family-name:var(--font-display)] text-forest dark:text-night-text text-center">
          Photography
        </h1>
        {/* Sort controls */}
        <div className="mt-6 flex justify-center sm:justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2 rounded-full text-sm bg-parchment-dark dark:bg-night-card border border-parchment-border dark:border-night-border text-forest dark:text-green-light font-[family-name:var(--font-mono)] cursor-pointer"
          >
            <option value="date">Date</option>
            <option value="camera">Camera</option>
            <option value="lens">Lens</option>
          </select>
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
              <div className="text-center py-3 px-4 text-sm text-white/70 font-[family-name:var(--font-body)]">
                <span>{photo.date}</span>
                <span className="mx-2">&middot;</span>
                <span>{photo.camera}</span>
                <span className="mx-2">&middot;</span>
                <span>{photo.lens}</span>
              </div>
            )
          }
        }}
      />
    </div>
  )
}
