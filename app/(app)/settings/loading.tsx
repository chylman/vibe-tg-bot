import { Skeleton } from '@/shared/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      <Skeleton className="h-7 w-48 mb-1" />
      <Skeleton className="h-4 w-96 mb-8" />

      <Skeleton className="h-4 w-20 mb-3" />
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>

      <Skeleton className="h-4 w-36 mb-2" />
      <Skeleton className="h-44 w-full rounded-md mb-8" />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-16 rounded-md" />
        <Skeleton className="h-16 rounded-md" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>

      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-20 w-full rounded-md mb-8" />

      <Skeleton className="h-9 w-44 rounded-md" />
    </div>
  )
}
