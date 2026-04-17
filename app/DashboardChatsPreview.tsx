'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type ChatRow = {
  telegram_chat_id: any
  username: string | null
  last_message_text: string | null
  last_message_sender: string | null
  last_message_at: string | null
}

type MsgRow = { telegram_chat_id: any; created_at: string }

export default function DashboardChatsPreview({
  chats,
  allRows,
}: {
  chats: ChatRow[]
  allRows: MsgRow[]
}) {
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const map: Record<string, string> = {}
    for (const chat of chats) {
      const id = String(chat.telegram_chat_id)
      const val = localStorage.getItem('lastRead_' + id)
      if (val) map[id] = val
    }
    setLastReadMap(map)

    function sync() {
      const updated: Record<string, string> = {}
      for (const chat of chats) {
        const id = String(chat.telegram_chat_id)
        const val = localStorage.getItem('lastRead_' + id)
        if (val) updated[id] = val
      }
      setLastReadMap(updated)
    }
    window.addEventListener('chat-marked-read', sync)
    return () => window.removeEventListener('chat-marked-read', sync)
  }, [chats])

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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Последние чаты</h2>
        <Link
          href="/chats"
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Все чаты →
        </Link>
      </div>

      {chats.length === 0 ? (
        <div className="px-4 py-8 text-sm text-zinc-500 text-center">Пока нет чатов</div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {chats.map((c) => {
            const id = String(c.telegram_chat_id)
            const unread = unreadCounts[id] ?? 0
            const when = c.last_message_at
              ? new Date(c.last_message_at).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''
            const preview = c.last_message_text
              ? (c.last_message_sender === 'manager' ? '↩ ' : '') + c.last_message_text
              : '—'

            return (
              <li key={id}>
                <Link
                  href={`/chats?chatId=${encodeURIComponent(id)}`}
                  className="flex items-start justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {c.username ? `@${c.username}` : `Chat ${id}`}
                      </span>
                      {unread > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{preview}</p>
                  </div>
                  <span className="ml-4 shrink-0 text-[10px] text-zinc-400 mt-0.5">{when}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
