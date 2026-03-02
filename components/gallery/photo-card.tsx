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
      className={`mb-4 break-inside-avoid cursor-pointer rounded-lg ${
        entryDone
          ? 'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2.5 hover:shadow-card-hover'
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
              transition: 'all 500ms ease-out',
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
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          onLoad={() => setIsLoaded(true)}
          className="w-full h-auto transition-all duration-700 ease-out"
          style={{
            filter: isLoaded ? 'blur(0)' : 'blur(20px)',
            transform: isLoaded ? 'scale(1)' : 'scale(1.1)',
          }}
        />
      </div>
    </div>
  )
}
