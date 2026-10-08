import { cn } from "./cn.ts";

export function ProgressRing({
  progress,
  size,
  radius,
  strokeWidth,
  className,
  barClassName,
  trackClassName,
}: {
  progress: number;
  size: number;
  radius: number;
  strokeWidth: number;
  className?: string;
  barClassName: string;
  trackClassName?: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn("-rotate-90", className)}
    >
      {trackClassName && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
      )}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        className={cn("transition-[stroke-dashoffset] duration-300 ease-out", barClassName)}
      />
    </svg>
  );
}
