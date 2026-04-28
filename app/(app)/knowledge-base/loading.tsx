import { Skeleton } from '@/shared/ui/Skeleton'

export default function KnowledgeBaseLoading() {
  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <Skeleton className="h-7 w-40 mb-1" />
      <Skeleton className="h-4 w-80 mb-6" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
