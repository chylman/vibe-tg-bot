import { Skeleton } from '@/shared/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Manager card */}
        <Skeleton className="h-24 w-full rounded-xl" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Chats preview */}
          <div className="lg:col-span-3 rounded-xl border border-zinc-200 overflow-hidden">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full mt-px" />
            ))}
          </div>

          {/* Tickets */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-200 overflow-hidden">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mt-px" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
