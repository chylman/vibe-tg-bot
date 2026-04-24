'use client'

import Link from 'next/link'
import { formatDateTime } from '@/shared/lib/format-date'
import type { ChatPreviewRow, MessageRow } from '@/entities/chat/model/types'
import { useUnreadCounts } from '@/features/track-unread/api/use-unread-counts'

export default function DashboardChatsPreview({
  chats,
  allRows,
}: {
  chats: ChatPreviewRow[]
  allRows: MessageRow[]
}) {
  const chatIds = chats.map((c) => String(c.telegram_chat_id))
  const { unreadCounts } = useUnreadCounts(chatIds, allRows)

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
            const when = c.last_message_at ? formatDateTime(c.last_message_at) : ''
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
                  <span suppressHydrationWarning className="ml-4 shrink-0 text-[10px] text-zinc-400 mt-0.5">{when}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
