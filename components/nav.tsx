"use client";

import Link from "next/link";
import DarkModeToggle from "@/components/dark-mode-toggle";

export default function Nav() {
  return (
    <nav
      className="sticky top-0 z-40 bg-parchment/80 dark:bg-night/80 backdrop-blur-md
        border-b border-parchment-border dark:border-night-border
        transition-colors duration-300"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Left: Name / Home link */}
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-base sm:text-lg text-forest dark:text-green-light
            hover:text-forest-deep dark:hover:text-night-text transition-colors duration-200"
        >
          Amir Abdur-Rahim
        </Link>

        {/* Right: Gallery link + Dark mode toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/gallery"
            className="font-[family-name:var(--font-body)] text-sm text-slate-muted dark:text-night-muted
              hover:text-forest dark:hover:text-green-light transition-colors duration-200
              min-h-[44px] flex items-center px-2"
          >
            Gallery
          </Link>

          <DarkModeToggle
            className="flex h-11 w-11 items-center justify-center rounded-full
              bg-parchment-dark/80 dark:bg-night-card/80 backdrop-blur-sm
              border border-parchment-border dark:border-night-border
              text-slate dark:text-night-text
              cursor-pointer transition-colors duration-300
              hover:bg-parchment-border dark:hover:bg-night-border"
          />
        </div>
      </div>
    </nav>
  );
}
