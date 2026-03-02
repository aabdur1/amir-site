"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

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
            opacity: 0,
            marginRight: "0.3em",
            ...(hydrated
              ? {
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
