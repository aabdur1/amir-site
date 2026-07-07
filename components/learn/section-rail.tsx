"use client"

import { useEffect, useState } from "react"
import type { ArtifactSection } from "@/lib/learn/artifacts"

/*
 * SectionRail — sticky ledger-style section nav for /learn/[slug] pages.
 * Lives in the left margin at xl+ only (same clearance approach as the
 * homepage Spine: the rail column ends 1.5rem short of the 64rem content
 * block, so it can never collide with content). Labeled ticks link to each
 * section; an IntersectionObserver highlights the one currently in view,
 * marked by a peach dot on the axis (the Spine's pen-tip echo). Smooth
 * scroll on click unless prefers-reduced-motion.
 */
export function SectionRail({ sections }: { sections: ArtifactSection[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    setActiveId(null)
    let io: IntersectionObserver | null = null
    let mo: MutationObserver | null = null

    // Artifact components mount late (code-split, several ssr:false), so the
    // targets may not exist yet — retry on DOM mutations until they all do.
    const attach = (): boolean => {
      const targets = new Map<Element, string>()
      for (const s of sections) {
        const heading = document.getElementById(s.id)
        if (!heading) return false
        targets.set(heading.closest("section") ?? heading, s.id)
      }
      const inView = new Set<string>()
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = targets.get(entry.target)
            if (!id) continue
            if (entry.isIntersecting) inView.add(id)
            else inView.delete(id)
          }
          // First section (in reading order) inside the band wins; keep the
          // previous highlight while scrolling the gaps between sections.
          const current = sections.find((s) => inView.has(s.id))
          if (current) setActiveId(current.id)
        },
        { rootMargin: "-15% 0px -60% 0px" }
      )
      targets.forEach((_, el) => io!.observe(el))
      return true
    }

    if (!attach()) {
      mo = new MutationObserver(() => {
        if (attach()) {
          mo?.disconnect()
          mo = null
        }
      })
      mo.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      io?.disconnect()
      mo?.disconnect()
    }
  }, [sections])

  function onLinkClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id)
    if (!el) return // fall through to the default anchor jump
    e.preventDefault()
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    history.replaceState(null, "", `#${id}`)
  }

  return (
    <nav
      aria-label="Sections on this page"
      className="hidden xl:block absolute top-0 bottom-0 z-[1] pointer-events-none"
      style={{ left: 0, width: "calc((100vw - 64rem) / 2 - 1.5rem)" }}
    >
      <div className="sticky top-32 flex justify-end pointer-events-auto">
        <ul className="relative m-0 list-none p-0">
          {/* Axis hairline the ticks emanate from */}
          <span
            aria-hidden="true"
            className="absolute right-0 top-1.5 bottom-1.5 w-px bg-cream-border/80 dark:bg-night-border/80"
          />
          {sections.map((s) => {
            const active = s.id === activeId
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => onLinkClick(e, s.id)}
                  aria-current={active ? "location" : undefined}
                  className="group relative flex items-center justify-end gap-2 py-1.5 pr-1"
                >
                  <span
                    className={`font-[family-name:var(--font-mono)] text-[12px] tracking-[0.08em] whitespace-nowrap transition-colors duration-300 ${
                      active
                        ? "text-mauve dark:text-mauve-dark"
                        : "text-ink-subtle dark:text-night-muted group-hover:text-ink dark:group-hover:text-night-text"
                    }`}
                  >
                    {s.label}
                  </span>
                  {/* Tick — draws longer and takes the structural mauve when current */}
                  <span
                    aria-hidden="true"
                    className={`h-px -mr-1 transition-all duration-300 ${
                      active
                        ? "w-4 bg-mauve dark:bg-mauve-dark"
                        : "w-2.5 bg-cream-border dark:bg-night-border group-hover:bg-ink-faint dark:group-hover:bg-night-muted"
                    }`}
                  />
                  {/* Peach commit dot on the axis for the current section */}
                  <span
                    aria-hidden="true"
                    className={`absolute -right-1 top-1/2 -translate-y-1/2 translate-x-1/2 w-[5px] h-[5px] rounded-full bg-peach dark:bg-peach-dark transition-opacity duration-300 ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
