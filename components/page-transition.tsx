'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Module-level Set persists across navigations within the SPA session,
// but resets on hard refresh (full page reload).
const visitedPages = new Set<string>()

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasVisited = visitedPages.has(pathname)
  const items = React.Children.toArray(children)

  // Mark this path as visited after the component mounts.
  // Runs after the first render so the animation style is determined
  // before the Set is updated.
  useEffect(() => {
    visitedPages.add(pathname)
  }, [pathname])

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
