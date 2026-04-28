import { Skeleton } from '@/shared/ui/Skeleton'

export default function TicketsLoading() {
  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <Skeleton className="h-7 w-32 mb-6" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
