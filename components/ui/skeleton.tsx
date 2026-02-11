import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

/* ─── Pre-built Skeleton Patterns ─── */

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-6 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-6 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      <div className="grid border-b border-white/[0.06] p-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          className="grid p-4 border-b border-white/[0.04]"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`r-${r}-c-${c}`} className="h-4 w-[65%]" />
          ))}
        </div>
      ))}
    </div>
  )
}

function SkeletonChat({ messages = 4, className }: { messages?: number; className?: string }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {Array.from({ length: messages }).map((_, i) => {
        const isRight = i % 2 === 0
        return (
          <div key={i} className={cn("flex gap-3", isRight && "flex-row-reverse")}>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className={cn("space-y-1.5 max-w-[60%]", isRight && "items-end")}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-16 w-48 rounded-xl" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SkeletonWallet({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="glass-card p-8 text-center space-y-4">
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-12 w-48 mx-auto" />
        <div className="flex justify-center gap-3">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonStat, SkeletonTable, SkeletonChat, SkeletonWallet }
