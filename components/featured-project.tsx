"use client";

import Image from "next/image";
import { ACCENT_STYLES } from "@/lib/styles";

const IMG_WIDTH = 640;
const IMG_HEIGHT = 1391;

const pills = ["Swift 6", "SwiftUI", "Vision OCR", "HealthKit"];

export function FeaturedProject({ visible }: { visible: boolean }) {
  const s = ACCENT_STYLES.rosewater;
  const peach = ACCENT_STYLES.peach;

  return (
    <a
      href="https://theli.app"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Theli — privacy-first iOS nutrition scanner, coming soon to the App Store (opens in new tab)"
      className={`group relative grid lg:grid-cols-[2fr_1fr] gap-6 lg:gap-10 items-center
        p-6 sm:p-8 mb-4 sm:mb-6 rounded-2xl
        border-t-[3px] border-t-rosewater dark:border-t-rosewater-dark
        bg-cream/80 dark:bg-night/60
        border border-cream-border/60 dark:border-night-border/60
        ${s.hoverBorder}
        hover:-translate-y-1 hover:shadow-card`}
      style={{
        opacity: 0,
        transition:
          "transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring), border-color 300ms ease",
        ...(visible
          ? { animation: "fade-in-up 0.5s ease-out 200ms forwards" }
          : {}),
      }}
    >
      {/* Text column */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h3 className="text-2xl font-[family-name:var(--font-display)] text-ink dark:text-night-text leading-tight">
            Theli
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1
              ${peach.bg} border ${peach.border}
              text-[12px] tracking-wide font-[family-name:var(--font-badge)] ${peach.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${peach.dot} shrink-0`} />
            Coming soon — App Store
          </span>
        </div>

        <p className="text-sm font-[family-name:var(--font-badge)] italic text-ink-subtle dark:text-night-muted mb-3">
          Privacy-first iOS Nutrition Scanner — independent product
        </p>

        <p className="text-sm sm:text-base font-[family-name:var(--font-body)] text-ink dark:text-night-text/70 leading-relaxed mb-4">
          Barcode lookup + on-device label OCR, Apple Health sync. No accounts, no
          ads, no tracking.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {pills.map((pill) => (
            <span
              key={pill}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
                ${s.bg} border ${s.border}
                text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)] ${s.text}`}
            >
              <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Screenshot column — stacks above text on mobile */}
      <div className="order-first lg:order-last mx-auto w-36 sm:w-44 lg:w-full lg:max-w-[200px]">
        <Image
          src="/theli/home.png"
          alt="Theli home screen in its dark theme"
          width={IMG_WIDTH}
          height={IMG_HEIGHT}
          sizes="(max-width: 640px) 144px, 200px"
          className="w-full h-auto rounded-2xl border border-cream-border/60 dark:border-night-border/60
            group-hover:scale-[1.02] transition-transform duration-300"
        />
      </div>

      {/* External-link arrow */}
      <div
        className="absolute top-4 right-4 text-ink-faint/40 dark:text-night-muted/40
        group-hover:text-ink-muted dark:group-hover:text-night-muted
        transition-colors duration-200"
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path
            fillRule="evenodd"
            d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </a>
  );
}
