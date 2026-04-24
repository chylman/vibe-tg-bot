'use client'

import { useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { KnowledgeEntry } from '@/entities/knowledge-entry/model/types'

type Props = {
  adminId: string
  editEntry: KnowledgeEntry | null
  onSuccess: () => void
  onCancel: () => void
}

const EMPTY = { question: '', answer: '', category: '' }

export function KnowledgeEntryForm({ adminId, editEntry, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState(
    editEntry
      ? { question: editEntry.question, answer: editEntry.answer, category: editEntry.category ?? '' }
      : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim() || null,
    }

    let savedId: string | null = null

    if (editEntry) {
      const { data, error } = await supabase
        .from('knowledge_base')
        .update(payload)
        .eq('id', editEntry.id)
        .select('id')
        .single()
      if (error) { setError(error.message); setSaving(false); return }
      savedId = data.id
    } else {
      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({ ...payload, is_active: true, created_by: adminId })
        .select('id')
        .single()
      if (error) { setError(error.message); setSaving(false); return }
      savedId = data.id
    }

    if (savedId) {
      supabase.functions.invoke('generate-embedding', { body: { id: savedId } })
        .catch(() => {})
    }

    setSaving(false)
    onSuccess()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
    >
      <h3 className="font-semibold text-sm">
        {editEntry ? 'Редактировать запись' : 'Новая запись'}
      </h3>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Вопрос *</label>
        <input
          required
          value={form.question}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
          placeholder="Как добавить упражнение?"
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Ответ *</label>
        <textarea
          required
          value={form.answer}
          onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
          rows={4}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
          placeholder="Зайдите в раздел «Упражнения» и нажмите «+»..."
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Категория</label>
        <input
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
          placeholder="тренировки / подписка / техническое"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
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
          {saving ? 'Сохранение...' : editEntry ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </form>
  )
}
