"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DarkModeToggle from "@/components/dark-mode-toggle";

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Thin accent stripe at the very top */}
      <div className="h-0.5 bg-gradient-to-r from-forest via-green-light to-forest dark:from-green-light/60 dark:via-green-light dark:to-green-light/60" />

      <nav
        className="sticky top-0 z-40 bg-parchment-dark/90 dark:bg-night-card/90 backdrop-blur-lg
          border-b border-parchment-border/40 dark:border-night-border/40
          transition-all duration-300"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8">
          {/* Left: Logo mark + Name */}
          <Link
            href="/"
            className="group flex items-center gap-3 hover:opacity-80 transition-opacity duration-200"
          >
            {/* Green square logo mark */}
            <span className="flex h-8 w-8 items-center justify-center rounded-lg
              bg-forest dark:bg-green-light
              text-parchment dark:text-night text-sm font-[family-name:var(--font-display)]
              group-hover:scale-105 transition-transform duration-200">
              A
            </span>
            <span className="font-[family-name:var(--font-display)] text-2xl sm:text-[1.7rem] text-forest dark:text-night-text
              leading-none">
              Amir Abdur-Rahim
            </span>
          </Link>

          {/* Right: Nav links + Dark mode toggle */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/gallery"
              className={`group relative font-[family-name:var(--font-body)] text-sm sm:text-base
                tracking-wide uppercase
                min-h-[44px] flex items-center px-3 sm:px-4
                transition-colors duration-200
                ${pathname === "/gallery"
                  ? "text-forest dark:text-green-light"
                  : "text-slate-muted dark:text-night-muted hover:text-forest dark:hover:text-green-light"
                }`}
            >
              Gallery
              {/* Active indicator or hover underline */}
              <span className={`absolute bottom-2.5 left-3 right-3 h-0.5 rounded-full
                bg-forest dark:bg-green-light transition-transform duration-300 origin-left
                ${pathname === "/gallery" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
              />
            </Link>

            {/* Subtle separator */}
            <div className="h-5 w-px bg-parchment-border dark:bg-night-border mx-1 sm:mx-2" />

            <DarkModeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
