'use client'

import { useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { Ticket } from '@/entities/ticket/model/types'

type Props = {
  adminId: string
  onSuccess: () => void
  onCancel: () => void
}

const EMPTY = { title: '', description: '', due_at: '', priority: 'normal' as Ticket['priority'], telegram_chat_id: '' }

export function CreateTicketForm({ adminId, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
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
    setSaving(false)
    if (error) { setError(error.message); return }
    onSuccess()
  }

  return (
    <form
      onSubmit={handleSubmit}
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
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-200 dark:border-zinc-700 px-4 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Сохранение...' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
