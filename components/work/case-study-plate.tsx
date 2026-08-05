import Image from 'next/image'
import type { CaseStudyPlate as CaseStudyPlateData } from '@/lib/work/case-studies'

// A product screenshot presented as a mounted print: the image keeps its own
// light styling in both themes and sits inside four fixed registration
// corners. Same print metaphor as the headshot and the Spotify featured card
// — the plate is the artefact, the marks are the mount.

export function CaseStudyPlate({ plate }: { plate: CaseStudyPlateData }) {
  return (
    <figure className="mx-auto max-w-3xl">
      {/* .reg-mark already declares position:absolute and border-color; the
          border-t/-l/-b/-r utilities supply the width that makes it visible.
          Matches interactive-headshot.tsx, the reference implementation. */}
      <div className="relative px-3 py-3 sm:px-5 sm:py-5">
        <span aria-hidden="true" className="reg-mark top-0 left-0 border-t border-l hidden lg:block" />
        <span aria-hidden="true" className="reg-mark top-0 right-0 border-t border-r hidden lg:block" />
        <span aria-hidden="true" className="reg-mark bottom-0 left-0 border-b border-l hidden lg:block" />
        <span aria-hidden="true" className="reg-mark bottom-0 right-0 border-b border-r hidden lg:block" />
        <Image
          src={plate.src}
          alt={plate.alt}
          width={plate.width}
          height={plate.height}
          sizes="(min-width: 768px) 768px, 100vw"
          className="w-full h-auto rounded-md border border-cream-border dark:border-night-border"
        />
      </div>
      <figcaption className="mt-3 text-center font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
        {plate.caption}
      </figcaption>
    </figure>
  )
}
