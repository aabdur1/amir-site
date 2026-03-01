'use client'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ animation: 'fade-in 0.5s ease-out' }}>
      {children}
    </div>
  )
}
