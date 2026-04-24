'use client'

import { useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import { STATUS_LABEL, STATUS_STYLE, STATUS_NEXT, PRIORITY_LABEL, PRIORITY_STYLE } from '@/shared/lib/constants'
import { formatDateTimeFull } from '@/shared/lib/format-date'
import { useTickets } from '@/entities/ticket/api/use-tickets'
import type { Ticket } from '@/entities/ticket/model/types'

const EMPTY_FORM = { title: '', description: '', due_at: '', priority: 'normal' as Ticket['priority'], telegram_chat_id: '' }

export default function TicketsClient({ adminId }: { adminId: string }) {
  const { tickets, setTickets, loading, error: loadError, reload } = useTickets()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState<'all' | Ticket['status']>('all')

  async function createTicket(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload: Record<string, any> = {
      manager_id: adminId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_at: form.due_at || null,
      priority: form.priority,
      status: 'open',
    }
    if (form.telegram_chat_id.trim()) {
      payload.telegram_chat_id = Number(form.telegram_chat_id.trim())
    }
    const { error } = await supabase.from('tickets').insert(payload)
    if (error) {
      setError(error.message)
    } else {
      setForm(EMPTY_FORM)
      setShowForm(false)
      await reload()
    }
    setSaving(false)
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

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={createTicket}
          className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
        >
          <h3 className="font-semibold text-sm mb-3">Новый тикет</h3>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Заголовок *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Что нужно сделать?"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
              placeholder="Дополнительные детали..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Срок</label>
              <input
                type="datetime-local"
                value={form.due_at}
                onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Приоритет</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Ticket['priority'] }))}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Chat ID клиента</label>
              <input
                type="number"
                value={form.telegram_chat_id}
                onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="необязательно"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      )}

      {/* Error */}
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
