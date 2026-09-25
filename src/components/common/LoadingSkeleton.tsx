import { cn } from '@/utils/cn'

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-6 w-full animate-pulse rounded-lg bg-muted/60',
            className
          )}
        />
      ))}
    </div>
  )
}
