'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { ChatSession } from '../model/types'

export function useChatSession(
  chatIdStr: string | null,
  chatIdNum: number | string | null,
  adminId: string,
) {
  const [session, setSession]                         = useState<ChatSession | null>(null)
  const [sessionLoading, setSessionLoading]           = useState(true)
  const [sessionError, setSessionError]               = useState('')
  const [sessionWorking, setSessionWorking]           = useState(false)
  const [wasForceDisconnected, setWasForceDisconnected] = useState(false)

  useEffect(() => {
    if (chatIdStr == null || chatIdNum == null) {
      setSessionLoading(false)
      return
    }

    let active = true
    setSessionLoading(true)
    setSession(null)
    setSessionError('')
    setWasForceDisconnected(false)

    supabase
      .from('chat_sessions')
      .select('*, managers(name)')
      .eq('telegram_chat_id', chatIdNum as any)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setSession((data as ChatSession) ?? null)
        setSessionLoading(false)
      })

    const channel = supabase
      .channel('chat-session-' + chatIdStr)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_sessions', filter: `telegram_chat_id=eq.${chatIdStr}` },
        (payload) => { setSession(payload.new as ChatSession) }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_sessions', filter: `telegram_chat_id=eq.${chatIdStr}` },
        () => {
          setSession(prev => {
            if (prev?.manager_id === adminId) setWasForceDisconnected(true)
            return null
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [chatIdStr, chatIdNum])

  async function connect() {
    if (chatIdNum == null) return
    setSessionWorking(true)
    setSessionError('')
    const { error } = await supabase.from('chat_sessions').insert({
      telegram_chat_id: chatIdNum as number,
      manager_id: adminId,
    })
    if (error) {
      setSessionWorking(false)
      setSessionError(error.code === '23505'
        ? 'Другой менеджер уже подключился к этому чату.'
        : error.message)
      return
    }
    setSession({ telegram_chat_id: chatIdNum as number, manager_id: adminId, connected_at: new Date().toISOString() })
    setSessionWorking(false)
    await supabase.functions.invoke('notify-manager-connected', { body: { telegram_chat_id: chatIdNum } })
  }

  async function disconnect() {
    if (chatIdNum == null) return
    setSessionWorking(true)
    setSessionError('')
    await supabase.functions.invoke('notify-manager-disconnected', { body: { telegram_chat_id: chatIdNum } })
    const { error } = await supabase.from('chat_sessions').delete().eq('telegram_chat_id', chatIdNum as number)
    if (error) { setSessionWorking(false); setSessionError(error.message); return }
    setSession(null)
    setSessionWorking(false)
  }

  async function forceDisconnect() {
    if (chatIdNum == null) return
    setSessionWorking(true)
    setSessionError('')
    await supabase.functions.invoke('notify-manager-disconnected', { body: { telegram_chat_id: chatIdNum } })
    const { error } = await supabase.from('chat_sessions').delete().eq('telegram_chat_id', chatIdNum as number)
    if (error) { setSessionWorking(false); setSessionError(error.message); return }
    setSession(null)
    setSessionWorking(false)
  }

  return {
    session,
    sessionLoading,
    sessionError,
    sessionWorking,
    wasForceDisconnected,
    setWasForceDisconnected,
    connect,
    disconnect,
    forceDisconnect,
  }
}
