import { Skeleton } from '@/shared/ui/Skeleton'

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full border border-zinc-200 rounded-lg dark:border-zinc-800">
      {/* Session banner */}
      <Skeleton className="h-11 w-full rounded-none rounded-t-lg shrink-0" />

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        {[false, true, false, false, true, false, true].map((isOwn, i) => (
          <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <Skeleton className={`h-10 rounded-lg ${isOwn ? 'w-44' : 'w-60'}`} />
          </div>
        ))}
      </div>

      {/* Input */}
      <Skeleton className="h-14 w-full rounded-none rounded-b-lg shrink-0" />
    </div>
  )
}
