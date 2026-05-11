import { memo } from "react";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  /** "up"=higher is worse, "down"=lower is worse, "auto"=neutral */
  worseDirection?: "up" | "down" | "auto";
}

/** Minimal SVG sparkline — no recharts, near-zero overhead. */
function SparklineImpl({
  values,
  width = 80,
  height = 24,
  color,
  worseDirection = "auto",
}: SparklineProps) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) {
    return <div className="text-[10px] text-muted-foreground">—</div>;
  }
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const stepX = width / (clean.length - 1);
  const points = clean
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");

  const last = clean[clean.length - 1];
  const first = clean[0];
  const trendUp = last > first;
  const worse =
    worseDirection === "up" ? trendUp : worseDirection === "down" ? !trendUp : false;
  const stroke = color ?? (worse ? "hsl(var(--warning))" : "hsl(var(--success))");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(clean.length - 1) * stepX}
        cy={height - ((last - min) / range) * height}
        r={2}
        fill={stroke}
      />
    </svg>
  );
}

export const Sparkline = memo(SparklineImpl);
