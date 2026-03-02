"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DarkModeToggle from "@/components/dark-mode-toggle";

export default function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isGallery = pathname === "/gallery";

  // On the home page, hide the nav name until the hero name scrolls away
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolledPastHero(window.scrollY > 200);
  }, []);

  useEffect(() => {
    if (!isHome) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // check initial position
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome, handleScroll]);

  const showName = !isHome || scrolledPastHero;

  return (
    <nav
      className="sticky top-0 z-40 bg-cream/90 dark:bg-night/90 backdrop-blur-lg
        transition-colors duration-300"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-6 sm:px-10 lg:px-12">
        {/* Left: Name — fades in after scrolling past hero on home page */}
        <Link
          href="/"
          className="nav-wordmark font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text
            tracking-tight leading-none transition-all duration-500"
          style={{
            opacity: showName ? 1 : 0,
            transform: showName ? "translateY(0)" : "translateY(6px)",
            pointerEvents: showName ? "auto" : "none",
          }}
        >
          Amir Abdur-Rahim
        </Link>

        {/* Right: Nav links + Dark mode toggle */}
        <div className="flex items-center gap-5">
          {/* Gallery — pill with arrow that expands on hover */}
          <Link
            href="/gallery"
            className={`nav-gallery-pill group relative font-[family-name:var(--font-mono)] text-[13px]
              tracking-[0.15em] uppercase
              px-4 py-2 rounded-full border overflow-hidden
              transition-all duration-300
              ${isGallery
                ? "nav-gallery-active border-mauve dark:border-mauve-dark text-ink dark:text-night-text"
                : "border-cream-border dark:border-night-border text-ink-muted dark:text-night-muted hover:border-sapphire/60 dark:hover:border-sapphire-dark/60 hover:text-ink dark:hover:text-night-text"
              }`}
          >
            <span className="relative z-10 flex items-center gap-0 group-hover:gap-1.5 transition-all duration-300">
              Gallery
              {/* Arrow slides in on hover */}
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-0 opacity-0 group-hover:w-3 group-hover:opacity-100
                  overflow-hidden transition-all duration-300"
              >
                <path d="M2 6h8M7 3l3 3-3 3" />
              </svg>
            </span>
          </Link>

          <DarkModeToggle />
        </div>
      </div>

      {/* Thin rule — the editorial line */}
      <div className="h-px bg-cream-border dark:bg-night-border" />
    </nav>
  );
}
