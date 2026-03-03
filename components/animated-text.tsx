"use client";

import { useHydrated } from "@/lib/hooks";

interface AnimatedTextProps {
  text: string;
  className?: string;
  /** Extra delay in ms added before the stagger starts */
  delay?: number;
}

export function AnimatedText({ text, className = "", delay = 0 }: AnimatedTextProps) {
  const hydrated = useHydrated();

  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            display: "inline-block",
            marginRight: "0.3em",
            ...(hydrated
              ? {
                  opacity: 0,
                  animation: `fade-in-up 0.6s ease-out ${delay + index * 100}ms forwards`,
                }
              : {}),
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
