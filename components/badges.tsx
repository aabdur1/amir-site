"use client";

import { useEffect, useRef, useState } from "react";

const badges = [
  "1st Place — AWS National Cloud Quest",
  "Zscaler Zero Trust Architect",
  "MS in MIS — UIC '26",
  "AWS Cloud Security Builder",
];

export function Badges() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-16 sm:py-24 px-6">
      <div
        ref={containerRef}
        className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3 sm:gap-4"
      >
        {badges.map((badge, i) => (
          <span
            key={badge}
            className="rounded-full px-5 py-2.5
              bg-forest/10 dark:bg-green-light/10
              border border-parchment-border dark:border-night-border
              text-sm font-[family-name:var(--font-mono)]
              text-forest dark:text-green-light
              hover:-translate-y-1 hover:shadow-card
              transition-all duration-300"
            style={{
              opacity: 0,
              transform: "translateY(24px)",
              ...(isInView
                ? {
                    animation: "fade-in-up 0.6s ease-out forwards",
                    animationDelay: `${i * 100}ms`,
                  }
                : {}),
            }}
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}
