'use client'

import { useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { Msg } from '@/entities/message/model/types'
import type { ChatSession } from '@/entities/chat/model/types'

type Props = {
  chatIdStr: string | null
  chatIdNum: number | string | null
  adminId: string
  isMySession: boolean
  session: ChatSession | null
  onOptimisticAdd: (msg: Msg) => void
  onOptimisticRemove: (id: string) => void
  onOptimisticConfirm: (tempId: string, realId: string) => void
  onScrollToBottom: () => void
  onError: (msg: string) => void
}

export function SendMessageForm({
  chatIdStr,
  chatIdNum,
  adminId,
  isMySession,
  session,
  onOptimisticAdd,
  onOptimisticRemove,
  onOptimisticConfirm,
  onScrollToBottom,
  onError,
}: Props) {
  const [text, setText] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || !isMySession) return
    if (chatIdStr == null || chatIdNum == null) {
      onError('Нельзя отправить сообщение: некорректный chatId')
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
    onOptimisticAdd(optimistic)
    setText('')
    setTimeout(() => onScrollToBottom(), 0)

    const { data: msgRow, error: insertError } = await supabase
      .from('messages')
      .insert({ text: value, telegram_chat_id: chatIdNum as any, admin_uid: adminId, sender: 'manager', status: 'pending' })
      .select('id')
      .single()

    if (insertError) {
      onError(insertError.message)
      onOptimisticRemove(optimisticId)
      return
    }

    onOptimisticConfirm(optimisticId, String(msgRow.id))

    const { error: fnError } = await supabase.functions.invoke('send-telegram-message', {
      body: { telegram_chat_id: chatIdNum, text: value, message_id: msgRow.id },
    })
    if (fnError) {
      onError(`Сообщение записано, но доставка не удалась: ${fnError.message}`)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
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
  )
}
