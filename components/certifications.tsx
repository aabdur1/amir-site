"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Badge } from "@/lib/badges";

const accentHoverBorders = [
  "hover:border-sapphire/40 dark:hover:border-sapphire-dark/40",
  "hover:border-mauve/40 dark:hover:border-mauve-dark/40",
  "hover:border-peach/40 dark:hover:border-peach-dark/40",
  "hover:border-lavender/40 dark:hover:border-lavender-dark/40",
] as const;

interface CertificationsProps {
  badges: Badge[];
}

export function Certifications({ badges }: CertificationsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 sm:py-28 bg-cream-dark/40 dark:bg-night-card/30"
    >
      {/* Top ornamental divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3 -translate-y-1/2">
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
        <span className="text-peach dark:text-peach-dark text-xs leading-none">&#9670;</span>
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {/* Section header */}
        <div
          className="text-center mb-14"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in-up 0.6s ease-out forwards" } : {}),
          }}
        >
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
            text-ink-muted dark:text-night-muted mb-3">
            <span className="text-peach dark:text-peach-dark">01</span>
            <span className="mx-2 text-cream-border dark:text-night-border">/</span>
            Certifications
          </p>
          <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)]
            text-ink dark:text-night-text">
            Verified Credentials
          </h2>
          <div className="mt-4 mx-auto h-px w-12 bg-mauve dark:bg-mauve-dark origin-center"
            style={{
              transform: "scaleX(0)",
              ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}),
            }}
          />
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {badges.map((badge, i) => (
            <a
              key={badge.name}
              href={badge.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl
                bg-cream/80 dark:bg-night/60
                border border-cream-border/60 dark:border-night-border/60
                hover:-translate-y-1 hover:shadow-card ${accentHoverBorders[i % 4]}
                transition-all duration-300`}
              style={{
                opacity: 0,
                ...(visible
                  ? {
                      animation: `fade-in-up 0.5s ease-out ${200 + i * 80}ms forwards`,
                    }
                  : {}),
              }}
            >
              {/* Badge image */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3
                group-hover:scale-105 transition-transform duration-300">
                <Image
                  src={badge.img}
                  alt={badge.name}
                  width={96}
                  height={96}
                  sizes="(max-width: 640px) 80px, 96px"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Badge info */}
              <span className="text-sm font-[family-name:var(--font-badge)]
                text-ink/80 dark:text-night-text/80 leading-snug mb-1">
                {badge.shortName}
              </span>
              <span className="text-xs font-[family-name:var(--font-mono)]
                text-ink-muted/60 dark:text-night-muted/60 tracking-wide uppercase">
                {badge.org}
              </span>
            </a>
          ))}
        </div>

        {/* Credly link */}
        <div
          className="text-center mt-10"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in 0.6s ease-out 1s forwards" } : {}),
          }}
        >
          <a
            href="https://www.credly.com/users/amir-abdur-rahim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-[family-name:var(--font-body)]
              text-ink-muted dark:text-night-muted
              hover:text-ink dark:hover:text-night-text
              py-3 transition-colors duration-200"
          >
            View all on Credly
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
