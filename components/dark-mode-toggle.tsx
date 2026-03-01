"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  // Watch for class changes on documentElement (triggered by toggle())
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

export default function DarkModeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Initialize theme from localStorage / system preference on mount.
  // This is a pure DOM side-effect (no setState) -- exactly what effects are for.
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    let isDark: boolean;
    if (stored === "dark" || stored === "light") {
      isDark = stored === "dark";
    } else {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, []);

  // suppressHydrationWarning is on the button so the server-rendered sun icon
  // won't warn if the client immediately shows the moon icon instead.
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
      className={className ?? `fixed top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full
        bg-parchment-dark/80 dark:bg-night-card/80 backdrop-blur-sm
        border border-parchment-border dark:border-night-border
        text-slate dark:text-night-text
        cursor-pointer transition-colors duration-300
        hover:bg-parchment-border dark:hover:bg-night-border`}
    >
      <span className="relative h-5 w-5">
        {/* Sun icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            dark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>

        {/* Moon icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            dark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
