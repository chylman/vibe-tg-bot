'use client'

import { formatDateTime } from '@/shared/lib/format-date'
import type { ChatItem, MessageRow } from '@/entities/chat/model/types'
import { useUnreadCounts } from '@/features/track-unread/api/use-unread-counts'

export default function ChatSidebar({
  chats,
  allRows,
  activeChatId,
  chatsError,
  linkBase = '/chats',
}: {
  chats: ChatItem[]
  allRows: MessageRow[]
  activeChatId?: string
  chatsError?: string | null
  linkBase?: string
}) {
  const chatIds = chats.map((c) => String(c.telegram_chat_id))
  const { unreadCounts } = useUnreadCounts(chatIds, allRows)

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-3 overflow-y-auto">
      <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Чаты</div>

      {chatsError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          Не удалось загрузить список чатов: {chatsError}
        </div>
      )}
      {!chatsError && chats.length === 0 && (
        <div className="text-sm text-zinc-600">Пока нет чатов</div>
      )}

      <ul className="space-y-1">
        {chats.map((c) => {
          const id = String(c.telegram_chat_id)
          const isActive = id === activeChatId
          const last = c.last_at ? new Date(c.last_at) : null
          const when = last && !isNaN(last.getTime()) ? formatDateTime(c.last_at) : ''
          const unread = unreadCounts[id] ?? 0

          return (
            <li key={id}>
              <a
                href={`${linkBase}?chatId=${encodeURIComponent(id)}`}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate" title={id}>
                    Chat {id}
                  </span>
                  {unread > 0 && !isActive && (
                    <span className="shrink-0 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
                <span
                  suppressHydrationWarning
                  className={`ml-3 shrink-0 text-[10px] ${
                    isActive ? 'opacity-80' : 'text-zinc-500'
                  }`}
                >
                  {when}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
