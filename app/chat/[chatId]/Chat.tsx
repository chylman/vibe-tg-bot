'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { formatDateTime } from '@/shared/lib/format-date'
import { useMessages } from '@/entities/message/api/use-messages'
import { useChatSession } from '@/entities/chat/api/use-chat-session'
import { SessionBanner } from '@/features/manage-session/ui/SessionBanner'
import { SendMessageForm } from '@/features/send-message/ui/SendMessageForm'

export default function Chat({ chatId, adminEmail, adminId }: { chatId: string; adminEmail: string; adminId: string }) {
  const osRef = useRef<OverlayScrollbarsComponentRef>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const pendingScrollRestore = useRef<number | null>(null)

  const getViewport = () => osRef.current?.osInstance()?.elements().viewport ?? null
  const [animParent] = useAutoAnimate({ duration: 200 })

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
    confirmOptimistic,
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
    const vp = getViewport()
    if (pendingScrollRestore.current !== null && vp) {
      vp.scrollTop += vp.scrollHeight - pendingScrollRestore.current
      pendingScrollRestore.current = null
    }
  })

  // IntersectionObserver: trigger loadMore when the top sentinel enters view
  useEffect(() => {
    const el = topRef.current
    const container = getViewport()
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
        pendingScrollRestore.current = getViewport()?.scrollHeight ?? null
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
      id: `a-${m.stableId ?? m.id}`,
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

  return (
    <div className="flex flex-col h-full border border-zinc-200 rounded-lg bg-white dark:border-zinc-800 dark:bg-zinc-900">

      <SessionBanner
        sessionLoading={sessionLoading}
        session={session}
        sessionError={sessionError}
        sessionWorking={sessionWorking}
        wasForceDisconnected={wasForceDisconnected}
        isMySession={isMySession}
        onConnect={connect}
        onDisconnect={disconnect}
        onForceDisconnect={forceDisconnect}
        onDismissForceDisconnected={() => setWasForceDisconnected(false)}
      />

      {/* Message list */}
      <OverlayScrollbarsComponent
        ref={osRef}
        element="div"
        className="flex-1 min-h-0"
        style={{ height: '0' }}
        options={{ scrollbars: { autoHide: 'scroll', autoHideDelay: 600 }, overflow: { x: 'hidden' } }}
      >
        <div className="p-4 space-y-3" ref={animParent}>
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
      </OverlayScrollbarsComponent>

      <SendMessageForm
        chatIdStr={chatIdStr}
        chatIdNum={chatIdNum}
        adminId={adminId}
        isMySession={isMySession}
        session={session}
        onOptimisticAdd={(msg) => setAdminMessages((prev) => [...prev, msg])}
        onOptimisticRemove={(id) => setAdminMessages((prev) => prev.filter((m) => m.id !== id))}
        onOptimisticConfirm={confirmOptimistic}
        onScrollToBottom={() => scrollToBottom('smooth')}
        onError={setError}
      />
    </div>
  )
}
