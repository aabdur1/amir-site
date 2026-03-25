'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { Photo } from '@/lib/types'

interface PhotoCardProps {
  photo: Photo
  index: number
  onClick: () => void
}

export function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [entryDone, setEntryDone] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)
  const imgWrapperRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(() => {
    const wrapper = imgWrapperRef.current
    if (wrapper) {
      wrapper.style.viewTransitionName = 'gallery-photo'
    }
    onClick()
  }, [onClick])

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
    const delay = (index % 6) * 80 + 700 // stagger delay + animation duration
    const timer = setTimeout(() => setEntryDone(true), delay)
    return () => clearTimeout(timer)
  }, [isInView, index])

  // Scroll parallax — images scroll slightly slower than the page
  useEffect(() => {
    if (!entryDone) return
    const card = cardRef.current
    const imgWrapper = imgWrapperRef.current
    if (!card || !imgWrapper) return

    // Skip if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    // Set base scale for parallax (slightly zoomed to allow movement room)
    imgWrapper.style.transform = 'scale(1.08) translateY(0px)'

    let rafId: number | null = null
    const FACTOR = 0.15 // parallax intensity

    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const rect = card.getBoundingClientRect()
        const viewH = window.innerHeight
        // How far the card center is from viewport center, normalized
        const cardCenter = rect.top + rect.height / 2
        const offset = (cardCenter - viewH / 2) * FACTOR
        imgWrapper.style.transform = `scale(1.08) translateY(${-offset}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // initial position

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [entryDone])

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={handleClick}
      aria-label={`Open photo taken on ${photo.date} with ${photo.camera}`}
      className={`cursor-zoom-in rounded-lg text-left w-full ${isPortrait ? 'row-span-2' : ''} ${
        entryDone
          ? 'group transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'
          : ''
      }`}
      style={
        entryDone
          ? { opacity: 1 }
          : {
              opacity: isInView ? 1 : 0,
              transform: isInView
                ? 'translateY(0)'
                : 'translateY(24px)',
              transition: 'opacity 700ms ease-out, transform 700ms ease-out',
              transitionDelay: isInView ? `${(index % 6) * 80}ms` : '0ms',
            }
      }
    >
      <div className="overflow-hidden rounded-lg h-full">
        <div ref={imgWrapperRef} className="will-change-transform h-full">
          <Image
            src={photo.thumb || photo.url}
            alt={`Photograph by Amir Abdur-Rahim, ${photo.date} — ${photo.camera}, ${photo.lens}`}
            width={800}
            height={600}
            unoptimized
            {...(index < 4 ? { priority: true, loading: 'eager' as const } : {})}
            onLoad={(e) => {
              const img = e.currentTarget
              if (img.naturalHeight > img.naturalWidth) setIsPortrait(true)
              setIsLoaded(true)
            }}
            className={`w-full h-full object-cover transition-[filter] duration-700 ease-out ${
              isLoaded ? 'blur-0' : 'blur-[20px]'
            }`}
          />
        </div>
      </div>
    </button>
  )
}
