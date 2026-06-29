/**
 * useSkeleton — Skeleton loader component helper
 * Returns skeleton arrays of varying sizes for loading states
 */

export function useSkeleton(count: number = 5) {
  return Array.from({ length: count }, (_, i) => i);
}

/**
 * SkeletonCard — Reusable skeleton loader component
 */
export function SkeletonCard({ animated = true }: { animated?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-muted p-4 ${animated ? 'animate-pulse' : ''}`}>
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted-foreground/20" />
        <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
        <div className="h-3 w-full rounded bg-muted-foreground/20" />
      </div>
    </div>
  );
}

/**
 * SkeletonImage — Image skeleton loader
 */
export function SkeletonImage({
  aspect = "square",
  animated = true
}: {
  aspect?: "square" | "video" | "thumbnail"
  animated?: boolean
}) {
  const aspectRatios = {
    square: "aspect-square",
    video: "aspect-video",
    thumbnail: "aspect-[4/3]",
  };

  return (
    <div className={`${aspectRatios[aspect]} w-full rounded-lg border border-border bg-muted ${animated ? 'animate-pulse' : ''}`} />
  );
}

/**
 * SkeletonText — Text skeleton loader
 */
export function SkeletonText({
  lines = 3,
  animated = true
}: {
  lines?: number
  animated?: boolean
}) {
  return (
    <div className={`space-y-2 ${animated ? 'animate-pulse' : ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded bg-muted-foreground/20 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
