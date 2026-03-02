'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Module-level Set persists across navigations within the SPA session,
// but resets on hard refresh (full page reload).
const visitedPages = new Set<string>()

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasVisited = visitedPages.has(pathname)
  const items = React.Children.toArray(children)
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    visitedPages.add(pathname)
  }, [pathname])

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

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
