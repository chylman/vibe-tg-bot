'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Msg = {
  id: number | string
  text: string | null
  created_at: string
  username?: string | null
  telegram_chat_id?: string | number | null
}

type Outbox = {
  id: number | string
  text: string | null
  created_at: string
  sent_at: string | null
  status: string | null
  admin_uid: string | null
  telegram_chat_id: string | number | null
}

type ChatSession = {
  telegram_chat_id: number
  manager_id: string
  connected_at: string
}

export default function Chat({ chatId, adminEmail, adminId }: { chatId: string; adminEmail: string; adminId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userMessages, setUserMessages] = useState<Msg[]>([])
  const [adminMessages, setAdminMessages] = useState<Outbox[]>([])
  const [text, setText] = useState('')
  const [session, setSession] = useState<ChatSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string>('')
  const [sessionWorking, setSessionWorking] = useState(false) // connect/disconnect in progress
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }

  const chatIdStr = useMemo(() => {
    const raw = (chatId ?? '').toString().trim()
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return raw
  }, [chatId])

  const chatIdNum = useMemo(() => {
    if (chatIdStr == null) return null as any
    const n = Number(chatIdStr)
    return Number.isFinite(n) ? n : chatIdStr
  }, [chatIdStr])

  const isMySession = session?.manager_id === adminId

  // Scroll to bottom once the initial load is done
  useEffect(() => {
    if (!loading) scrollToBottom('auto')
  }, [loading])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setSessionLoading(true)
      setError('')
      setSessionError('')
      try {
        if (chatIdStr == null || chatIdNum == null) {
          throw new Error('Некорректный идентификатор чата')
        }
        const [mRes, oRes, sRes] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('telegram_chat_id', chatIdNum as any)
            .order('created_at', { ascending: true })
            .limit(500),
          supabase
            .from('bot_outbox')
            .select('*')
            .eq('telegram_chat_id', chatIdNum as any)
            .order('created_at', { ascending: true })
            .limit(500),
          supabase
            .from('chat_sessions')
            .select('*')
            .eq('telegram_chat_id', chatIdNum as any)
            .maybeSingle(),
        ])
        if (!active) return
        if (mRes.error) throw mRes.error
        if (oRes.error) throw oRes.error
        setUserMessages(mRes.data || [])
        setAdminMessages(oRes.data || [])
        setSession((sRes.data as ChatSession) ?? null)
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить чат')
      } finally {
        if (active) {
          setLoading(false)
          setSessionLoading(false)
        }
      }
    }
    load()

    const channelName = 'chat-' + (chatIdStr ?? 'invalid')
    const channel = supabase.channel(channelName)
    if (chatIdStr != null) {
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `telegram_chat_id=eq.${chatIdStr}` },
          (payload) => {
            setUserMessages((prev) => [...prev, payload.new as any])
            setTimeout(() => scrollToBottom('smooth'), 50)
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bot_outbox', filter: `telegram_chat_id=eq.${chatIdStr}` },
          (payload) => {
            setAdminMessages((prev) => {
              // Replace optimistic entry if present, otherwise append
              const incoming = payload.new as Outbox
              const withoutOptimistic = prev.filter((m) => typeof m.id !== 'string' || !m.id.startsWith('temp-'))
              return [...withoutOptimistic, incoming]
            })
            setTimeout(() => scrollToBottom('smooth'), 50)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bot_outbox', filter: `telegram_chat_id=eq.${chatIdStr}` },
          (payload) => {
            setAdminMessages((prev) =>
              prev.map((m) => (m.id === (payload.new as Outbox).id ? (payload.new as Outbox) : m))
            )
          }
        )
        // chat_sessions: no filter needed — the table rows are identified by telegram_chat_id (PK)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_sessions', filter: `telegram_chat_id=eq.${chatIdStr}` },
          (payload) => { setSession(payload.new as ChatSession) }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chat_sessions', filter: `telegram_chat_id=eq.${chatIdStr}` },
          () => { setSession(null) }
        )
        .subscribe()
    }

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
      // Unique constraint violation means another manager connected first
      if (error.code === '23505') {
        setSessionError('Другой менеджер уже подключился к этому чату.')
      } else {
        setSessionError(error.message)
      }
      return
    }
    // Optimistically update UI without waiting for realtime
    setSession({ telegram_chat_id: chatIdNum as number, manager_id: adminId, connected_at: new Date().toISOString() })
    setSessionWorking(false)
    // Notify the Telegram user
    await supabase.functions.invoke('notify-manager-connected', {
      body: { telegram_chat_id: chatIdNum },
    })
  }

  async function disconnect() {
    if (chatIdNum == null) return
    setSessionWorking(true)
    setSessionError('')

    // Notify the user before removing the session
    await supabase.functions.invoke('notify-manager-disconnected', {
      body: { telegram_chat_id: chatIdNum },
    })

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('telegram_chat_id', chatIdNum as number)
    if (error) {
      setSessionWorking(false)
      setSessionError(error.message)
      return
    }
    // Optimistically update UI without waiting for realtime
    setSession(null)
    setSessionWorking(false)
  }

  const merged = useMemo(() => {
    type Item = { kind: 'user' | 'admin'; id: string | number; text: string; at: string; meta?: any }
    const u: Item[] = (userMessages || []).map((m) => ({
      kind: 'user',
      id: `u-${m.id}`,
      text: m.text || '',
      at: m.created_at,
      meta: { username: m.username },
    }))
    const a: Item[] = (adminMessages || []).map((m) => ({
      kind: 'admin',
      id: `a-${m.id}`,
      text: m.text || '',
      at: m.created_at || m.sent_at || new Date().toISOString(),
      meta: { status: m.status },
    }))
    return [...u, ...a].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime())
  }, [userMessages, adminMessages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || !isMySession) return
    if (chatIdStr == null || chatIdNum == null) {
      setError('Нельзя отправить сообщение: некорректный chatId')
      return
    }

    const optimisticId = 'temp-' + Math.random().toString(36).slice(2)
    const optimistic: Outbox = {
      id: optimisticId,
      text: value,
      created_at: new Date().toISOString(),
      sent_at: null,
      status: 'pending',
      admin_uid: adminId,
      telegram_chat_id: chatIdNum,
    }
    setAdminMessages((prev) => [...prev, optimistic])
    setText('')
    setTimeout(() => scrollToBottom('smooth'), 0)

    // Insert to bot_outbox (audit log) and retrieve the new row ID
    const { data: outboxRow, error: insertError } = await supabase
      .from('bot_outbox')
      .insert({ text: value, telegram_chat_id: chatIdNum as any, admin_uid: adminId })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setAdminMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      return
    }

    // Deliver to the user via Telegram Bot API through our Edge Function
    const { error: fnError } = await supabase.functions.invoke('send-telegram-message', {
      body: { telegram_chat_id: chatIdNum, text: value, outbox_id: outboxRow.id },
    })
    if (fnError) {
      setError(`Сообщение записано, но доставка не удалась: ${fnError.message}`)
    }
  }

  return (
    <div className="flex flex-col h-full border border-zinc-200 rounded-lg bg-white dark:border-zinc-800 dark:bg-zinc-900">

      {/* Session banner */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between gap-3 min-h-[44px]">
        {sessionLoading ? (
          <span className="text-xs text-zinc-400">Загрузка состояния чата…</span>
        ) : isMySession ? (
          <>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              ● Вы подключены к чату
            </span>
            <button
              onClick={disconnect}
              disabled={sessionWorking}
              className="text-xs rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              {sessionWorking ? 'Отключение…' : 'Отключиться'}
            </button>
          </>
        ) : session ? (
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            ● Чат занят другим менеджером
          </span>
        ) : (
          <>
            <span className="text-xs text-zinc-500">
              ○ Чат не обслуживается — бот отвечает автоматически
            </span>
            <button
              onClick={connect}
              disabled={sessionWorking}
              className="text-xs rounded-md bg-black text-white px-3 py-1 hover:opacity-90 dark:bg-white dark:text-black disabled:opacity-50"
            >
              {sessionWorking ? 'Подключение…' : 'Подключиться к чату'}
            </button>
          </>
        )}
      </div>

      {sessionError && (
        <div className="mx-4 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {sessionError}
        </div>
      )}

      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ height: '0' }}>
        {loading && <div className="text-sm text-zinc-500">Загрузка…</div>}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        {!loading && merged.length === 0 && (
          <div className="text-sm text-zinc-500">Сообщений пока нет.</div>
        )}
        {merged.map((item) => (
          <div
            key={item.id}
            className={`max-w-[80%] ${item.kind === 'admin' ? 'ml-auto text-right' : 'mr-auto'}`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 text-sm shadow-sm ${
                item.kind === 'admin'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{item.text}</div>
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              {new Date(item.at).toLocaleString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
              })}
              {item.kind === 'admin' && item.meta?.status ? ` · ${item.meta.status}` : ''}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send form — only active when this manager holds the session */}
      <form
        onSubmit={sendMessage}
        className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isMySession}
          placeholder={
            isMySession
              ? 'Написать сообщение…'
              : session
              ? 'Чат занят другим менеджером'
              : 'Подключитесь к чату, чтобы писать'
          }
          className="flex-1 rounded-md border px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!isMySession || !text.trim()}
          className="rounded-md bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Отправить
        </button>
      </form>
    </div>
  )
}
