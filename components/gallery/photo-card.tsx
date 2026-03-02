'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { Photo } from '@/lib/types'

interface PhotoCardProps {
  photo: Photo
  index: number
  onClick: () => void
}

export function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [entryDone, setEntryDone] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // After the entry animation finishes, enable hover effects
  useEffect(() => {
    if (!isInView) return
    const delay = (index % 8) * 60 + 500 // stagger delay + animation duration
    const timer = setTimeout(() => setEntryDone(true), delay)
    return () => clearTimeout(timer)
  }, [isInView, index])

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      role="button"
      tabIndex={0}
      aria-label={`Open photo taken on ${photo.date} with ${photo.camera}`}
      className={`mb-4 break-inside-avoid cursor-pointer rounded-lg ${
        entryDone
          ? 'group transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]'
          : ''
      }`}
      style={
        entryDone
          ? { opacity: 1 }
          : {
              opacity: isInView ? 1 : 0,
              transform: isInView
                ? 'scale(1) rotate(0deg)'
                : 'scale(0.95) rotate(1.5deg)',
              transition: 'opacity 500ms ease-out, transform 500ms ease-out',
              transitionDelay: isInView ? `${(index % 8) * 60}ms` : '0ms',
            }
      }
    >
      <div className="overflow-hidden rounded-lg">
        <Image
          src={photo.url}
          alt={`Photo taken on ${photo.date}`}
          width={800}
          height={600}
          unoptimized
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-auto transition-[filter,transform] duration-700 ease-out group-hover:scale-[1.04] group-hover:duration-[2s] ${
            isLoaded ? 'blur-0 scale-100' : 'blur-[20px] scale-110'
          }`}
        />
      </div>
    </div>
  )
}
