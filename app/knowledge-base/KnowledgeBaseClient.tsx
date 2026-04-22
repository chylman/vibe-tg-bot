'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Entry = {
  id: string
  question: string
  answer: string
  category: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
}

const EMPTY_FORM = { question: '', answer: '', category: '' }

export default function KnowledgeBaseClient({ adminId }: { adminId: string }) {
  const [entries, setEntries]   = useState<Entry[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, question, answer, category, is_active, created_at, created_by')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setEntries((data ?? []) as Entry[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditEntry(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError('')
  }

  function openEdit(e: Entry) {
    setEditEntry(e)
    setForm({ question: e.question, answer: e.answer, category: e.category ?? '' })
    setShowForm(true)
    setError('')
  }

  function cancelForm() {
    setShowForm(false)
    setEditEntry(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function generateEmbedding(text: string): Promise<void> {
    // Embedding generation happens in the edge function via Supabase AI
    // Here we call a lightweight RPC that triggers embedding update server-side
    await supabase.rpc('generate_kb_embedding' as any, { entry_id: text })
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      question: form.question.trim(),
      answer:   form.answer.trim(),
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

    // Trigger embedding generation via edge function
    if (savedId) {
      supabase.functions.invoke('generate-embedding', { body: { id: savedId } })
        .catch(() => {}) // non-blocking, embedding will be generated async
    }

    setShowForm(false)
    setEditEntry(null)
    setForm(EMPTY_FORM)
    await load()
    setSaving(false)
  }

  async function toggleActive(entry: Entry) {
    const { error } = await supabase
      .from('knowledge_base')
      .update({ is_active: !entry.is_active })
      .eq('id', entry.id)
    if (error) setError(error.message)
    else setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e))
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('knowledge_base').delete().eq('id', id)
    if (error) setError(error.message)
    else setEntries(prev => prev.filter(e => e.id !== id))
  }

  const visible = entries.filter(e => {
    if (filterActive === 'active')   return e.is_active
    if (filterActive === 'inactive') return !e.is_active
    return true
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterActive === f
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Отключённые'}
            </button>
          ))}
          <span className="text-xs text-zinc-400 ml-1">{visible.length} записей</span>
        </div>
        <button
          onClick={openCreate}
          className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
        >
          + Добавить запись
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={saveEntry}
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
              onClick={cancelForm}
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
      )}

      {error && !showForm && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500">Загрузка...</div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          Нет записей. Добавьте первую!
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map(entry => (
            <li
              key={entry.id}
              className={`rounded-xl border p-4 transition-colors ${
                entry.is_active
                  ? 'border-zinc-200 dark:border-zinc-800'
                  : 'border-zinc-100 bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{entry.question}</span>
                    {entry.category && (
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                        {entry.category}
                      </span>
                    )}
                    {!entry.is_active && (
                      <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500">
                        отключена
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2">{entry.answer}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActive(entry)}
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    title={entry.is_active ? 'Отключить' : 'Включить'}
                  >
                    {entry.is_active ? 'Выкл' : 'Вкл'}
                  </button>
                  <button
                    onClick={() => openEdit(entry)}
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
