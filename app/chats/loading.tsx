import { Skeleton } from '@/shared/ui/Skeleton'

export default function ChatsLoading() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Nav */}
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-zinc-200 p-3 space-y-1">
          <Skeleton className="h-4 w-16 mb-3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </aside>

        {/* Chat area */}
        <div className="flex-1 p-3 flex flex-col gap-3">
          {/* Session banner */}
          <Skeleton className="h-10 w-full rounded-lg shrink-0" />

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-hidden">
            {[false, true, false, false, true, false, true, false].map((isOwn, i) => (
              <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className={`h-10 rounded-lg ${isOwn ? 'w-48' : 'w-64'}`} />
              </div>
            ))}
          </div>

          {/* Input */}
          <Skeleton className="h-12 w-full rounded-lg shrink-0" />
        </div>
      </div>
    </div>
  )
}
