'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import { CHAT_PAGE_SIZE } from '@/shared/lib/constants'
import type { Msg } from '../model/types'

const PAGE_SIZE = CHAT_PAGE_SIZE

export function useMessages(chatIdStr: string | null, chatIdNum: number | string | null) {
  const [userMessages, setUserMessages]   = useState<Msg[]>([])
  const [adminMessages, setAdminMessages] = useState<Msg[]>([])
  const [botMessages, setBotMessages]     = useState<Msg[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [hasMore, setHasMore]             = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const oldestAtRef = useRef<string | null>(null)

  useEffect(() => {
    if (chatIdStr == null || chatIdNum == null) {
      setLoading(false)
      setError('Некорректный идентификатор чата')
      return
    }

    let active = true
    setLoading(true)
    setError('')
    setUserMessages([])
    setAdminMessages([])
    setBotMessages([])
    setHasMore(false)
    oldestAtRef.current = null

    supabase
      .from('messages')
      .select('*')
      .eq('telegram_chat_id', chatIdNum as any)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) { setError(err.message); setLoading(false); return }
        const all = ([...(data || [])].reverse()) as Msg[]
        oldestAtRef.current = all.length > 0 ? all[0].created_at : null
        setHasMore((data?.length ?? 0) === PAGE_SIZE)
        setUserMessages(all.filter(m => m.sender === 'user'))
        setAdminMessages(all.filter(m => m.sender === 'manager'))
        setBotMessages(all.filter(m => m.sender === 'bot'))
        setLoading(false)
      })

    const channel = supabase
      .channel('chat-messages-' + chatIdStr)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `telegram_chat_id=eq.${chatIdStr}` },
        (payload) => {
          const msg = payload.new as Msg
          if (msg.sender === 'manager') {
            setAdminMessages(prev => {
              const withoutOptimistic = prev.filter(m => !m.id.startsWith('temp-'))
              return [...withoutOptimistic, msg]
            })
          } else if (msg.sender === 'bot') {
            setBotMessages(prev => [...prev, msg])
          } else {
            setUserMessages(prev => [...prev, msg])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `telegram_chat_id=eq.${chatIdStr}` },
        (payload) => {
          const msg = payload.new as Msg
          if (msg.sender === 'manager') {
            setAdminMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [chatIdStr, chatIdNum])

  async function loadMore(options?: { onBeforePrepend?: (older: Msg[]) => void }) {
    if (!hasMore || isLoadingMore || chatIdNum == null || !oldestAtRef.current) return
    setIsLoadingMore(true)
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .eq('telegram_chat_id', chatIdNum as any)
      .lt('created_at', oldestAtRef.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (err || !data) { setIsLoadingMore(false); return }
    const older = ([...data].reverse()) as Msg[]
    if (older.length > 0) oldestAtRef.current = older[0].created_at
    setHasMore(data.length === PAGE_SIZE)
    options?.onBeforePrepend?.(older)
    setUserMessages(prev => [...older.filter(m => m.sender === 'user'), ...prev])
    setAdminMessages(prev => [...older.filter(m => m.sender === 'manager'), ...prev])
    setBotMessages(prev => [...older.filter(m => m.sender === 'bot'), ...prev])
    setIsLoadingMore(false)
  }

  return {
    userMessages,
    adminMessages,
    botMessages,
    setAdminMessages,
    loading,
    error,
    setError,
    hasMore,
    isLoadingMore,
    loadMore,
  }
}
