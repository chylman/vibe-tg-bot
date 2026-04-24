'use client'

import { useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import { useKnowledgeBase } from '@/entities/knowledge-entry/api/use-knowledge-base'
import type { KnowledgeEntry } from '@/entities/knowledge-entry/model/types'
import { KnowledgeEntryForm } from '@/features/manage-knowledge-entry/ui/KnowledgeEntryForm'

export default function KnowledgeBaseClient({ adminId, initialEntries }: { adminId: string; initialEntries?: KnowledgeEntry[] }) {
  const { entries, setEntries, loading, error: loadError, reload } = useKnowledgeBase(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null>(null)
  const [error, setError] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [reembedding, setReembedding] = useState(false)
  const [reembedMsg, setReembedMsg] = useState('')

  function openCreate() {
    setEditEntry(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(e: KnowledgeEntry) {
    setEditEntry(e)
    setShowForm(true)
    setError('')
  }

  function closeForm() {
    setShowForm(false)
    setEditEntry(null)
  }

  async function handleFormSuccess() {
    closeForm()
    await reload()
  }

  async function toggleActive(entry: KnowledgeEntry) {
    const { error } = await supabase
      .from('knowledge_base')
      .update({ is_active: !entry.is_active })
      .eq('id', entry.id)
    if (error) setError(error.message)
    else setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e))
  }

  async function reembedAll() {
    setReembedding(true)
    setReembedMsg('')
    setError('')
    const { data: allEntries } = await supabase
      .from('knowledge_base')
      .select('id')
    if (!allEntries) { setReembedding(false); return }
    let ok = 0
    let fail = 0
    for (const entry of allEntries) {
      const { error } = await supabase.functions.invoke('generate-embedding', { body: { id: entry.id } })
      if (error) { fail++ } else { ok++ }
    }
    setReembedMsg(`Готово: ${ok} обновлено${fail > 0 ? `, ${fail} ошибок` : ''}`)
    setReembedding(false)
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
        <div className="flex items-center gap-2">
          <button
            onClick={reembedAll}
            disabled={reembedding}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            title="Перегенерировать эмбеддинги для всех записей"
          >
            {reembedding ? 'Векторизация…' : '↻ Перевекторизировать'}
          </button>
          {reembedMsg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{reembedMsg}</span>
          )}
          <button
            onClick={openCreate}
            className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            + Добавить запись
          </button>
        </div>
      </div>

      {showForm && (
        <KnowledgeEntryForm
          adminId={adminId}
          editEntry={editEntry}
          onSuccess={handleFormSuccess}
          onCancel={closeForm}
        />
      )}

      {(loadError || error) && !showForm && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError || error}</div>
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
