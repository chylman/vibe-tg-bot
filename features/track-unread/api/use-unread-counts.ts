'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MessageRow } from '@/entities/chat/model/types'

export function useUnreadCounts(chatIds: string[], allRows: MessageRow[]) {
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>({})

  function syncFromStorage() {
    const map: Record<string, string> = {}
    for (const id of chatIds) {
      const val = localStorage.getItem('lastRead_' + id)
      if (val) map[id] = val
    }
    setLastReadMap(map)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    syncFromStorage()
    window.addEventListener('chat-marked-read', syncFromStorage)
    return () => window.removeEventListener('chat-marked-read', syncFromStorage)
  // chatIds is an array — join gives a stable primitive dependency
  }, [chatIds.join(',')])

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

  return { unreadCounts }
}
