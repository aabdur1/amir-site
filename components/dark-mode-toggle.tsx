"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
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

export default function DarkModeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const swapKeyRef = useRef(0);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("theme"); } catch {}
    if (stored === "dark" || stored === "light") {
      document.documentElement.classList.toggle("dark", stored === "dark");
      return;
    }
    // No stored preference — follow system and listen for changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    document.documentElement.classList.toggle("dark", mq.matches);
    const listener = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const toggle = useCallback(() => {
    const html = document.documentElement;
    const next = !html.classList.contains("dark");
    // Only animate theme transition if user hasn't opted out of motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      html.classList.add("theme-transitioning");
      setTimeout(() => html.classList.remove("theme-transitioning"), 350);
    }
    html.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be full or unavailable
    }
    // Trigger the swap animation by bumping the key
    swapKeyRef.current += 1;
    if (iconRef.current) {
      iconRef.current.classList.remove("dark-toggle-swap-enter");
      void iconRef.current.offsetWidth;
      iconRef.current.classList.add("dark-toggle-swap-enter");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
      className={`dark-toggle-btn flex h-11 w-11 items-center justify-center rounded-full
        text-ink-muted dark:text-night-muted
        border border-transparent
        cursor-pointer transition-all duration-200
        hover:text-ink dark:hover:text-night-text
        hover:bg-cream-dark/60 dark:hover:bg-night-card/60
        hover:border-cream-border/40 dark:hover:border-night-border/40
        ${dark ? "dark-toggle-sun" : "dark-toggle-moon"}`}
    >
      <span ref={iconRef} className="dark-toggle-icon relative h-5 w-5">
        {dark ? (
          /* Sun icon — amber, shown in dark mode */
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4.5 w-4.5 text-gold-dark"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          /* Moon icon — blue, shown in light mode */
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4.5 w-4.5 text-[#7287fd]"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </span>
    </button>
  );
}
