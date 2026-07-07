/*
 * SparkRule — the Living Ledger's replacement for static accent rules.
 * A tiny self-drawing data stroke: each section passes real numbers and a
 * variant, and the rule draws itself when the section reveals.
 * Decorative only (aria-hidden); reduced-motion renders it fully drawn via CSS.
 */

interface SparkRuleProps {
  data: number[];
  variant?: "line" | "step" | "bars";
  visible: boolean;
  delay?: number; // ms before the stroke starts drawing
  className?: string; // color classes; defaults to structural mauve
  width?: number;
  height?: number;
}

function scalePoints(
  data: number[],
  w: number,
  h: number,
  zeroBaseline: boolean
): [number, number][] {
  // Bars measure from zero so equal values keep visible height;
  // lines/steps normalize to the data range for shape contrast.
  const min = zeroBaseline ? 0 : Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 1.5;
  const padY = 2;
  return data.map((v, i) => [
    padX + (i / (data.length - 1 || 1)) * (w - padX * 2),
    h - padY - ((v - min) / range) * (h - padY * 2),
  ]);
}

export function SparkRule({
  data,
  variant = "line",
  visible,
  delay = 300,
  className = "text-mauve dark:text-mauve-dark",
  width = 88,
  height = 14,
}: SparkRuleProps) {
  const pts = scalePoints(data, width, height, variant === "bars");

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
    >
      {variant === "bars" ? (
        <g className={visible ? "is-drawn" : ""}>
          {pts.map(([x, y], i) => (
            <rect
              key={i}
              className="spark-bar"
              x={x - 1.75}
              y={y}
              width={3.5}
              height={height - 2 - y}
              rx={1}
              fill="currentColor"
              style={{ animationDelay: `${delay + i * 55}ms` }}
            />
          ))}
        </g>
      ) : (
        <polyline
          className={`draw-stroke ${visible ? "is-drawn" : ""}`}
          points={
            variant === "step"
              ? pts
                  .flatMap(([x, y], i) =>
                    i === 0 ? [`${x},${y}`] : [`${x},${pts[i - 1][1]}`, `${x},${y}`]
                  )
                  .join(" ")
              : pts.map(([x, y]) => `${x},${y}`).join(" ")
          }
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          style={{ animationDelay: `${delay}ms` }}
        />
      )}
    </svg>
  );
}
