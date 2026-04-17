'use client'

import { useEffect, useMemo, useState } from 'react'

type Chat = { telegram_chat_id: any; last_at: string }
type Row  = { telegram_chat_id: any; created_at: string }

export default function ChatSidebar({
  chats,
  allRows,
  activeChatId,
  chatsError,
  linkBase = '/chats',
}: {
  chats: Chat[]
  allRows: Row[]
  activeChatId?: string
  chatsError?: string | null
  linkBase?: string
}) {
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>({})

  function syncFromStorage() {
    const map: Record<string, string> = {}
    for (const chat of chats) {
      const id = String(chat.telegram_chat_id)
      const val = localStorage.getItem('lastRead_' + id)
      if (val) map[id] = val
    }
    setLastReadMap(map)
  }

  useEffect(() => {
    syncFromStorage()
    // Chat component fires this event when it marks a chat as read
    window.addEventListener('chat-marked-read', syncFromStorage)
    return () => window.removeEventListener('chat-marked-read', syncFromStorage)
  }, [])

  // Count rows newer than lastRead per chat
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of allRows) {
      const id = String(row.telegram_chat_id)
      const lastRead = lastReadMap[id]
      if (lastRead && row.created_at > lastRead) {
        counts[id] = (counts[id] ?? 0) + 1
      }
    }
    return counts
  }, [allRows, lastReadMap])

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
          const when =
            last && !isNaN(last.getTime())
              ? last.toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''
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
