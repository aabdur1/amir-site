"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DarkModeToggle from "@/components/dark-mode-toggle";

function useMagnetic(ref: React.RefObject<HTMLAnchorElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Skip on touch devices
    if (!window.matchMedia('(pointer: fine)').matches) return

    let targetX = 0, targetY = 0
    let currentX = 0, currentY = 0
    let rafId: number | null = null
    const MAX = 4 // max displacement in px
    const LERP = 0.15

    const animate = () => {
      currentX += (targetX - currentX) * LERP
      currentY += (targetY - currentY) * LERP
      el.style.transform = `translate(${currentX}px, ${currentY}px)`

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(animate)
      } else {
        el.style.transform = `translate(${targetX}px, ${targetY}px)`
        rafId = null
      }
    }

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.max(rect.width, rect.height)
      const factor = Math.max(0, 1 - dist / maxDist)
      targetX = dx * factor * (MAX / maxDist * 2)
      targetY = dy * factor * (MAX / maxDist * 2)
      // Clamp
      targetX = Math.max(-MAX, Math.min(MAX, targetX))
      targetY = Math.max(-MAX, Math.min(MAX, targetY))
      if (!rafId) rafId = requestAnimationFrame(animate)
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
      if (!rafId) rafId = requestAnimationFrame(animate)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
      el.style.transform = ''
    }
  }, [ref])
}

export default function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isGallery = pathname === "/gallery";
  const isLearn = pathname.startsWith("/learn");

  // Direct ref mutation avoids re-rendering the nav tree on every scroll frame
  const nameRef = useRef<HTMLAnchorElement>(null);
  const rafRef = useRef<number>(0);
  const learnPillRef = useRef<HTMLAnchorElement>(null);
  const galleryPillRef = useRef<HTMLAnchorElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const indicatorContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorMounted, setIndicatorMounted] = useState(false);

  const updateOpacity = useCallback(() => {
    const progress = Math.min(window.scrollY / 300, 1);
    const opacity = 0.6 + progress * 0.4;
    if (nameRef.current) {
      nameRef.current.style.opacity = String(opacity);
      nameRef.current.style.transform = `translateY(${(1 - opacity) * 4}px)`;
    }
    rafRef.current = 0;
  }, []);

  const handleScroll = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(updateOpacity);
    }
  }, [updateOpacity]);

  useEffect(() => {
    if (!isHome) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    updateOpacity();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isHome, handleScroll, updateOpacity]);

  useMagnetic(learnPillRef);
  useMagnetic(galleryPillRef);

  // Position the morphing indicator behind the active pill
  useEffect(() => {
    const indicator = indicatorRef.current
    if (!indicator) return

    const activeRef = isLearn ? learnPillRef : isGallery ? galleryPillRef : null

    if (!activeRef?.current) {
      // No active pill (homepage) — hide indicator
      indicator.style.opacity = '0'
      return
    }

    const pill = activeRef.current
    const container = indicatorContainerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const pillRect = pill.getBoundingClientRect()

    indicator.style.opacity = '1'
    indicator.style.width = `${pillRect.width}px`
    indicator.style.transform = `translateX(${pillRect.left - containerRect.left}px)`

    // Color: sapphire for Gallery, mauve for Learn
    const accent = isGallery ? 'var(--color-sapphire)' : 'var(--color-mauve)'
    indicator.style.backgroundColor = `color-mix(in srgb, ${accent} 12%, transparent)`
    indicator.style.borderColor = `color-mix(in srgb, ${accent} 40%, transparent)`

    // After first positioning, enable transitions
    if (!indicatorMounted) {
      requestAnimationFrame(() => setIndicatorMounted(true))
    }
  }, [pathname, isLearn, isGallery, indicatorMounted])

  return (
    <nav
      className="sticky top-0 z-40 bg-cream/70 dark:bg-night/70 backdrop-blur-lg
        transition-colors duration-300"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-6 sm:px-10 lg:px-12">
        {/* Left: Name — ghosted at top, progressively fades in on scroll */}
        <Link
          ref={nameRef}
          href="/"
          className="nav-wordmark min-w-0 font-[family-name:var(--font-display)] text-[length:var(--step-2)] text-ink dark:text-night-text
            tracking-tight leading-none"
          style={{
            opacity: isHome ? 0.6 : 1,
            transform: isHome ? `translateY(${(1 - 0.6) * 4}px)` : "none",
            transition: isHome ? "none" : "opacity 0.5s, transform 0.5s",
          }}
        >
          Amir Abdur-Rahim
        </Link>

        {/* Right: Nav links + Dark mode toggle */}
        <div className="flex items-center gap-5">
          <div ref={indicatorContainerRef} className="relative flex items-center gap-2">
            {/* Morphing indicator */}
            <div
              ref={indicatorRef}
              className="absolute top-0 left-0 h-full rounded-full border pointer-events-none"
              style={{
                transition: indicatorMounted
                  ? 'transform 500ms var(--ease-spring), width 500ms var(--ease-spring), opacity 300ms ease'
                  : 'none',
                opacity: 0,
              }}
            />
          {/* Learn — pill with arrow that expands on hover */}
          <Link
            ref={learnPillRef}
            href="/learn"
            className={`nav-learn-pill group relative font-[family-name:var(--font-mono)] text-[13px]
              tracking-[0.15em] uppercase
              px-4 py-2 rounded-full border overflow-hidden
              transition-all duration-300
              ${isLearn
                ? "nav-learn-active border-transparent text-ink dark:text-night-text"
                : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/60 dark:hover:border-mauve-dark/60 hover:text-ink dark:hover:text-night-text"
              }`}
          >
            <span className={`relative z-10 flex items-center transition-all duration-300 ${
              isLearn ? 'gap-1.5' : 'gap-0 group-hover:gap-1.5'
            }`}>
              Learn
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3 overflow-hidden transition-all duration-300 ${
                  isLearn ? 'w-3 opacity-100' : 'w-0 opacity-0 group-hover:w-3 group-hover:opacity-100'
                }`}
              >
                <path d="M2 6h8M7 3l3 3-3 3" />
              </svg>
            </span>
          </Link>

          {/* Gallery — pill with arrow that expands on hover */}
          <Link
            ref={galleryPillRef}
            href="/gallery"
            className={`nav-gallery-pill group relative font-[family-name:var(--font-mono)] text-[13px]
              tracking-[0.15em] uppercase
              px-4 py-2 rounded-full border overflow-hidden
              transition-all duration-300
              ${isGallery
                ? "nav-gallery-active border-transparent text-ink dark:text-night-text"
                : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-sapphire/60 dark:hover:border-sapphire-dark/60 hover:text-ink dark:hover:text-night-text"
              }`}
          >
            <span className={`relative z-10 flex items-center transition-all duration-300 ${
              isGallery ? 'gap-1.5' : 'gap-0 group-hover:gap-1.5'
            }`}>
              Gallery
              {/* Arrow slides in on hover */}
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3 overflow-hidden transition-all duration-300 ${
                  isGallery ? 'w-3 opacity-100' : 'w-0 opacity-0 group-hover:w-3 group-hover:opacity-100'
                }`}
              >
                <path d="M2 6h8M7 3l3 3-3 3" />
              </svg>
            </span>
          </Link>
          </div>

          <DarkModeToggle />
        </div>
      </div>

      {/* Thin rule — the editorial line */}
      <div className="h-px bg-cream-border dark:bg-night-border" />
    </nav>
  );
}
