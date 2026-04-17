'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 50

type Msg = {
  id: string
  text: string | null
  created_at: string
  sender: 'user' | 'manager' | 'bot'
  username?: string | null
  telegram_chat_id?: string | number | null
  // manager-message fields
  admin_uid?: string | null
  status?: string | null
  sent_at?: string | null
}

type ChatSession = {
  telegram_chat_id: number
  manager_id: string
  connected_at: string
  managers?: { name: string } | null
}

export default function Chat({ chatId, adminEmail, adminId }: { chatId: string; adminEmail: string; adminId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userMessages, setUserMessages] = useState<Msg[]>([])
  const [adminMessages, setAdminMessages] = useState<Msg[]>([])
  const [botMessages, setBotMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [session, setSession] = useState<ChatSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string>('')
  const [sessionWorking, setSessionWorking] = useState(false) // connect/disconnect in progress
  const [wasForceDisconnected, setWasForceDisconnected] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const oldestAtRef = useRef<string | null>(null)
  const pendingScrollRestore = useRef<number | null>(null)

  // IDs of user messages that existed when the chat first loaded.
  // Any user message NOT in this set is "new" and triggers the divider.
  const loadedMsgIds = useRef<Set<string>>(new Set())
  const [firstNewMsgId, setFirstNewMsgId] = useState<string | null>(null)
  const [dividerVisible, setDividerVisible] = useState(false)
  const dividerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Reset all per-chat state whenever the chat changes
  useEffect(() => {
    loadedMsgIds.current = new Set()
    setFirstNewMsgId(null)
    setDividerVisible(false)
    setWasForceDisconnected(false)
    setHasMore(false)
    setIsLoadingMore(false)
    oldestAtRef.current = null
    pendingScrollRestore.current = null
    if (dividerTimerRef.current) clearTimeout(dividerTimerRef.current)
  }, [chatIdStr])

  // After initial load: snapshot which user message IDs already exist
  useEffect(() => {
    if (!loading) {
      loadedMsgIds.current = new Set(userMessages.map(m => String(m.id)))
      scrollToBottom('auto')
      markAsRead(merged)
    }
  }, [loading])

  // When new user messages arrive after the initial load: show divider
  useEffect(() => {
    if (loading || loadedMsgIds.current.size === 0) return
    // Find the first user message not present at load time
    const firstNew = userMessages.find(m => !loadedMsgIds.current.has(String(m.id)))
    if (firstNew) {
      if (firstNewMsgId === null) {
        setFirstNewMsgId(`u-${firstNew.id}`)
        setDividerVisible(true)
        if (dividerTimerRef.current) clearTimeout(dividerTimerRef.current)
        dividerTimerRef.current = setTimeout(() => setDividerVisible(false), 5000)
      }
      markAsRead(merged)
    }
  }, [userMessages.length])

  async function loadMore() {
    if (!hasMore || isLoadingMore || chatIdNum == null || !oldestAtRef.current) return
    setIsLoadingMore(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('telegram_chat_id', chatIdNum as any)
      .lt('created_at', oldestAtRef.current)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (error || !data) { setIsLoadingMore(false); return }
    const older = ([...data].reverse()) as Msg[]
    if (older.length > 0) oldestAtRef.current = older[0].created_at
    setHasMore(data.length === PAGE_SIZE)
    // Snapshot scroll height before prepend so we can restore position
    pendingScrollRestore.current = listRef.current?.scrollHeight ?? null
    // Mark prepended IDs as already-seen so they don't trigger the new-messages divider
    older.filter(m => m.sender === 'user').forEach(m => loadedMsgIds.current.add(String(m.id)))
    setUserMessages(prev => [...older.filter(m => m.sender === 'user'), ...prev])
    setAdminMessages(prev => [...older.filter(m => m.sender === 'manager'), ...prev])
    setBotMessages(prev => [...older.filter(m => m.sender === 'bot'), ...prev])
    setIsLoadingMore(false)
  }

  // After prepend: restore scroll position so the view doesn't jump to the top
  useLayoutEffect(() => {
    if (pendingScrollRestore.current !== null && listRef.current) {
      listRef.current.scrollTop += listRef.current.scrollHeight - pendingScrollRestore.current
      pendingScrollRestore.current = null
    }
  })

  // IntersectionObserver: trigger loadMore when the top sentinel enters view
  useEffect(() => {
    const el = topRef.current
    const container = listRef.current
    if (!el || !container || !hasMore || isLoadingMore) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { root: container, threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, chatIdStr])

  function markAsRead(currentMerged: typeof merged) {
    if (!chatIdStr || currentMerged.length === 0) return
    localStorage.setItem('lastRead_' + chatIdStr, currentMerged[currentMerged.length - 1].at)
    window.dispatchEvent(new CustomEvent('chat-marked-read'))
  }

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
        const [mRes, sRes] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('telegram_chat_id', chatIdNum as any)
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE),
          supabase
            .from('chat_sessions')
            .select('*, managers(name)')
            .eq('telegram_chat_id', chatIdNum as any)
            .maybeSingle(),
        ])
        if (!active) return
        if (mRes.error) throw mRes.error
        const all = ([...(mRes.data || [])].reverse()) as Msg[]
        oldestAtRef.current = all.length > 0 ? all[0].created_at : null
        setHasMore(mRes.data!.length === PAGE_SIZE)
        setUserMessages(all.filter(m => m.sender === 'user'))
        setAdminMessages(all.filter(m => m.sender === 'manager'))
        setBotMessages(all.filter(m => m.sender === 'bot'))
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
            const msg = payload.new as Msg
            if (msg.sender === 'manager') {
              setAdminMessages((prev) => {
                // Replace optimistic entry if present, otherwise append
                const withoutOptimistic = prev.filter((m) => !m.id.startsWith('temp-'))
                return [...withoutOptimistic, msg]
              })
            } else if (msg.sender === 'bot') {
              setBotMessages((prev) => [...prev, msg])
            } else {
              setUserMessages((prev) => [...prev, msg])
            }
            setTimeout(() => scrollToBottom('smooth'), 50)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `telegram_chat_id=eq.${chatIdStr}` },
          (payload) => {
            const msg = payload.new as Msg
            if (msg.sender === 'manager') {
              setAdminMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)))
            }
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
          () => {
            setSession((prev) => {
              if (prev?.manager_id === adminId) {
                setWasForceDisconnected(true)
              }
              return null
            })
          }
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

  async function forceDisconnect() {
    if (chatIdNum == null) return
    setSessionWorking(true)
    setSessionError('')

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
    setSession(null)
    setSessionWorking(false)
  }

  const merged = useMemo(() => {
    type Item = { kind: 'user' | 'admin' | 'bot'; id: string; text: string; at: string; meta?: any }
    const u: Item[] = userMessages.map((m) => ({
      kind: 'user',
      id: `u-${m.id}`,
      text: m.text || '',
      at: m.created_at,
      meta: { username: m.username },
    }))
    const a: Item[] = adminMessages.map((m) => ({
      kind: 'admin',
      id: `a-${m.id}`,
      text: m.text || '',
      at: m.created_at,
      meta: { status: m.status },
    }))
    const b: Item[] = botMessages.map((m) => ({
      kind: 'bot',
      id: `b-${m.id}`,
      text: m.text || '',
      at: m.created_at,
    }))
    return [...u, ...a, ...b].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime())
  }, [userMessages, adminMessages, botMessages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || !isMySession) return
    if (chatIdStr == null || chatIdNum == null) {
      setError('Нельзя отправить сообщение: некорректный chatId')
      return
    }

    const optimisticId = 'temp-' + Math.random().toString(36).slice(2)
    const optimistic: Msg = {
      id: optimisticId,
      text: value,
      created_at: new Date().toISOString(),
      sender: 'manager',
      sent_at: null,
      status: 'pending',
      admin_uid: adminId,
      telegram_chat_id: chatIdNum,
    }
    setAdminMessages((prev) => [...prev, optimistic])
    setText('')
    setTimeout(() => scrollToBottom('smooth'), 0)

    // Insert manager message into messages table and retrieve the new row ID
    const { data: msgRow, error: insertError } = await supabase
      .from('messages')
      .insert({ text: value, telegram_chat_id: chatIdNum as any, admin_uid: adminId, sender: 'manager', status: 'pending' })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setAdminMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      return
    }

    // Deliver to the user via Telegram Bot API through our Edge Function
    const { error: fnError } = await supabase.functions.invoke('send-telegram-message', {
      body: { telegram_chat_id: chatIdNum, text: value, message_id: msgRow.id },
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
          <>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ● Подключён: {session.managers?.name ?? 'другой менеджер'}
            </span>
            <button
              onClick={forceDisconnect}
              disabled={sessionWorking}
              className="text-xs rounded-md border border-red-300 text-red-600 px-3 py-1 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
            >
              {sessionWorking ? 'Отключение…' : 'Отключить менеджера'}
            </button>
          </>
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

      {wasForceDisconnected && (
        <div className="mx-4 mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex items-center justify-between">
          <span>Вы были отключены от чата другим менеджером.</span>
          <button
            onClick={() => setWasForceDisconnected(false)}
            className="ml-3 text-red-500 hover:text-red-700 font-bold leading-none"
          >
            ×
          </button>
        </div>
      )}

      {sessionError && (
        <div className="mx-4 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {sessionError}
        </div>
      )}

      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ height: '0' }}>
        <div ref={topRef} />
        {isLoadingMore && <div className="text-center text-xs text-zinc-400 py-1">Загрузка…</div>}
        {loading && <div className="text-sm text-zinc-500">Загрузка…</div>}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        {!loading && merged.length === 0 && (
          <div className="text-sm text-zinc-500">Сообщений пока нет.</div>
        )}
        {merged.map((item) => (
          <div key={item.id}>
            {firstNewMsgId !== null && String(item.id) === firstNewMsgId && (
              <div
                className={`flex items-center gap-2 my-2 transition-opacity duration-500 ${dividerVisible ? 'opacity-100' : 'opacity-0'}`}
                onTransitionEnd={() => {
                  if (!dividerVisible) {
                    setFirstNewMsgId(null)
                    // Expand the baseline so the next new message triggers a fresh divider
                    userMessages.forEach(m => loadedMsgIds.current.add(String(m.id)))
                  }
                }}
              >
                <div className="flex-1 h-px bg-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  Новые сообщения
                </span>
                <div className="flex-1 h-px bg-emerald-400" />
              </div>
            )}
          <div
            className={`max-w-[80%] ${item.kind === 'admin' ? 'ml-auto text-right' : 'mr-auto'}`}
          >
            {item.kind === 'bot' && (
              <div className="mb-0.5 text-[10px] text-indigo-400 flex items-center gap-1">
                <span>🤖</span><span>Автоответ</span>
              </div>
            )}
            <div
              className={`inline-block rounded-lg px-3 py-2 text-sm shadow-sm ${
                item.kind === 'admin'
                  ? 'bg-emerald-600 text-white'
                  : item.kind === 'bot'
                  ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100'
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
