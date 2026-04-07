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

export default function Chat({ chatId, adminEmail, adminId }: { chatId: string; adminEmail: string; adminId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [userMessages, setUserMessages] = useState<Msg[]>([])
  const [adminMessages, setAdminMessages] = useState<Outbox[]>([])
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const chatIdStr = useMemo(() => {
    const raw = (chatId ?? '').toString().trim()
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return raw
  }, [chatId])

  const chatIdNum = useMemo(() => {
    if (chatIdStr == null) return null as any
    // messages.telegram_chat_id в БД часто bigint; пробуем число, если возможно
    const n = Number(chatIdStr)
    return Number.isFinite(n) ? n : chatIdStr
  }, [chatIdStr])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (chatIdStr == null || chatIdNum == null) {
          throw new Error('Некорректный идентификатор чата')
        }
        const [mRes, oRes] = await Promise.all([
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
        ])
        if (!active) return
        if (mRes.error) throw mRes.error
        if (oRes.error) throw oRes.error
        setUserMessages(mRes.data || [])
        setAdminMessages(oRes.data || [])
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить чат')
      } finally {
        setLoading(false)
        // автоскролл вниз после загрузки
        setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: 'auto' }), 0)
      }
    }
    load()

    // Realtime подписки (опционально)
    const channelName = 'chat-' + (chatIdStr ?? 'invalid')
    const channel = supabase.channel(channelName)
    if (chatIdStr != null) {
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `telegram_chat_id=eq.${chatIdStr}` }, (payload) => {
          setUserMessages((prev) => [...prev, payload.new as any])
          setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_outbox', filter: `telegram_chat_id=eq.${chatIdStr}` }, (payload) => {
          setAdminMessages((prev) => [...prev, payload.new as any])
          setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)
        })
        .subscribe()
    } else {
      // Подписку не создаём при некорректном chatId
    }

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [chatIdStr, chatIdNum])

  const merged = useMemo(() => {
    type Item = { kind: 'user' | 'admin'; id: string | number; text: string; at: string; meta?: any }
    const u: Item[] = (userMessages || []).map((m) => ({ kind: 'user', id: `u-${m.id}`, text: m.text || '', at: m.created_at, meta: { username: m.username } }))
    const a: Item[] = (adminMessages || []).map((m) => ({ kind: 'admin', id: `a-${m.id}`, text: m.text || '', at: m.created_at || m.sent_at || new Date().toISOString(), meta: { status: m.status } }))
    return [...u, ...a].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime())
  }, [userMessages, adminMessages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    if (chatIdStr == null || chatIdNum == null) {
      setError('Нельзя отправить сообщение: некорректный chatId')
      return
    }

    const optimistic: Outbox = {
      id: 'temp-' + Math.random().toString(36).slice(2),
      text: value,
      created_at: new Date().toISOString(),
      sent_at: null,
      status: 'pending',
      admin_uid: adminId,
      telegram_chat_id: chatIdNum,
    }
    setAdminMessages((prev) => [...prev, optimistic])
    setText('')
    setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 0)

    const { error } = await supabase.from('bot_outbox').insert({
      text: value,
      telegram_chat_id: chatIdNum as any,
      admin_uid: adminId,
    })
    if (error) {
      setError(error.message)
      // откатить optimistic
      setAdminMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    }
  }

  return (
    <div className="flex flex-col border border-zinc-200 rounded-lg bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-sm text-zinc-500">Загрузка…</div>}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}
        {!loading && merged.length === 0 && (
          <div className="text-sm text-zinc-500">Сообщений пока нет.</div>
        )}
        {merged.map((item) => (
          <div key={item.id} className={`max-w-[80%] ${item.kind === 'admin' ? 'ml-auto text-right' : 'mr-auto'} `}>
            <div className={`inline-block rounded-lg px-3 py-2 text-sm shadow-sm ${item.kind === 'admin' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100'}`}>
              <div className="whitespace-pre-wrap">{item.text}</div>
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              {new Date(item.at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              {item.kind === 'admin' && item.meta?.status ? ` · ${item.meta.status}` : ''}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать сообщение…"
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-black text-white px-4 py-2 hover:opacity-90">Отправить</button>
      </form>
    </div>
  )
}
