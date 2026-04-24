'use client'

import { useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import { STATUS_LABEL, STATUS_STYLE, STATUS_NEXT, PRIORITY_LABEL, PRIORITY_STYLE } from '@/shared/lib/constants'
import { formatDateTimeFull } from '@/shared/lib/format-date'
import { useTickets } from '@/entities/ticket/api/use-tickets'
import type { Ticket } from '@/entities/ticket/model/types'
import { CreateTicketForm } from '@/features/create-ticket/ui/CreateTicketForm'

export default function TicketsClient({ adminId, initialTickets }: { adminId: string; initialTickets?: Ticket[] }) {
  const { tickets, setTickets, loading, error: loadError, reload } = useTickets(initialTickets)
  const [showForm, setShowForm] = useState(false)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState<'all' | Ticket['status']>('all')

  async function handleFormSuccess() {
    setShowForm(false)
    await reload()
  }

  async function advanceStatus(ticket: Ticket) {
    const next = STATUS_NEXT[ticket.status]
    const { error } = await supabase
      .from('tickets')
      .update({ status: next })
      .eq('id', ticket.id)
    if (error) setError(error.message)
    else setTickets((prev) => prev.map((t) => t.id === ticket.id ? { ...t, status: next } : t))
  }

  async function deleteTicket(id: string) {
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    if (error) setError(error.message)
    else setTickets((prev) => prev.filter((t) => t.id !== id))
  }

  const visible = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter)

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {(['all', 'open', 'in_progress', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {s === 'all' ? 'Все' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          {showForm ? 'Отмена' : '+ Новый тикет'}
        </button>
      </div>

      {showForm && (
        <CreateTicketForm
          adminId={adminId}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {(loadError || error) && !showForm && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError || error}</div>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500">Загрузка...</div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          {filter === 'all' ? 'Нет тикетов. Создайте первый!' : 'Нет тикетов с таким статусом.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{t.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[t.priority]}`}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-zinc-500 mb-1">{t.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                    {t.due_at && (
                      <span>
                        Срок:{' '}
                        <span suppressHydrationWarning className={new Date(t.due_at) < new Date() && t.status !== 'closed' ? 'text-red-500 font-medium' : ''}>
                          {formatDateTimeFull(t.due_at)}
                        </span>
                      </span>
                    )}
                    {t.telegram_chat_id && (
                      <a
                        href={`/chats?chatId=${t.telegram_chat_id}`}
                        className="text-blue-500 hover:underline"
                      >
                        Chat {t.telegram_chat_id}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => advanceStatus(t)}
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
                    title={`Перевести в "${STATUS_LABEL[STATUS_NEXT[t.status]]}"`}
                  >
                    {STATUS_NEXT[t.status] === 'in_progress' && '▶ В работу'}
                    {STATUS_NEXT[t.status] === 'closed' && '✓ Закрыть'}
                    {STATUS_NEXT[t.status] === 'open' && '↩ Открыть'}
                  </button>
                  <button
                    onClick={() => deleteTicket(t.id)}
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
