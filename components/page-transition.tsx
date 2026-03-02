'use client'

import React from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children)

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
