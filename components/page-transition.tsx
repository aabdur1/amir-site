'use client'

import React, { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

// Module-level Set persists across navigations within the SPA session,
// but resets on hard refresh (full page reload).
const visitedPages = new Set<string>()

function subscribeToMotionPreference(callback: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getMotionSnapshot(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getMotionServerSnapshot(): boolean {
  return false
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasVisited = visitedPages.has(pathname)
  const items = React.Children.toArray(children)
  const prefersReduced = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionSnapshot,
    getMotionServerSnapshot
  )

  useEffect(() => {
    visitedPages.add(pathname)
  }, [pathname])

  // Reduced motion: render immediately without opacity:0 start state
  if (prefersReduced) {
    return <>{children}</>
  }

  // Return visit: quick uniform fade-in, no stagger, no translateY
  if (hasVisited) {
    return (
      <>
        {items.map((child, i) => (
          <div
            key={i}
            style={{
              opacity: 0,
              animation: 'fade-in 200ms ease-out forwards',
            }}
          >
            {child}
          </div>
        ))}
      </>
    )
  }

  // First visit: staggered fade-in-up (120ms between each child)
  return (
    <>
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: 0,
            animation: `fade-in-up 600ms ease-out ${i * 120}ms forwards`,
          }}
        >
          {child}
        </div>
      ))}
    </>
  )
}
