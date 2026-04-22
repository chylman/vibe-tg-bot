'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import { formatDateTime } from '@/shared/lib/format-date'
import { CHAT_PAGE_SIZE } from '@/shared/lib/constants'
import { useMessages } from '@/entities/message/api/use-messages'
import { useChatSession } from '@/entities/chat/api/use-chat-session'
import type { Msg } from '@/entities/message/model/types'

const PAGE_SIZE = CHAT_PAGE_SIZE

export default function Chat({ chatId, adminEmail, adminId }: { chatId: string; adminEmail: string; adminId: string }) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
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

  const {
    userMessages, adminMessages, botMessages, setAdminMessages,
    loading, error, setError,
    hasMore, isLoadingMore, loadMore,
  } = useMessages(chatIdStr, chatIdNum)

  const {
    session, sessionLoading, sessionError, sessionWorking, wasForceDisconnected,
    setWasForceDisconnected, connect, disconnect, forceDisconnect,
  } = useChatSession(chatIdStr, chatIdNum, adminId)

  const isMySession = session?.manager_id === adminId

  // Reset all per-chat UI state whenever the chat changes
  useEffect(() => {
    loadedMsgIds.current = new Set()
    setFirstNewMsgId(null)
    setDividerVisible(false)
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
      (entries) => { if (entries[0].isIntersecting) handleLoadMore() },
      { root: container, threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, chatIdStr])

  function handleLoadMore() {
    loadMore({
      onBeforePrepend: (older) => {
        // Snapshot scroll height before prepend so we can restore position
        pendingScrollRestore.current = listRef.current?.scrollHeight ?? null
        // Mark prepended IDs as already-seen so they don't trigger the new-messages divider
        older.filter(m => m.sender === 'user').forEach(m => loadedMsgIds.current.add(String(m.id)))
      },
    })
  }

  function markAsRead(currentMerged: typeof merged) {
    if (!chatIdStr || currentMerged.length === 0) return
    localStorage.setItem('lastRead_' + chatIdStr, currentMerged[currentMerged.length - 1].at)
    window.dispatchEvent(new CustomEvent('chat-marked-read'))
  }

  const merged = useMemo(() => {
    type Item = { kind: 'user' | 'admin' | 'bot'; id: string; text: string; at: string; meta?: any }
    const u: Item[] = userMessages.map((m) => ({
      kind: 'user',
      id: `u-${m.id}`,
      text: m.text || '',
      at: m.created_at,
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
            <div suppressHydrationWarning className="mt-1 text-[10px] text-zinc-500">
              {formatDateTime(item.at)}
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
