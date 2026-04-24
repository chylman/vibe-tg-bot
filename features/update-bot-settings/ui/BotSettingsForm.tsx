'use client'

import { useState } from 'react'
import type { BotSettings } from '@/entities/bot-settings/model/types'
import { AVAILABLE_MODELS } from '@/entities/bot-settings/model/types'

type Props = {
  initial: BotSettings
  onSave: (patch: Partial<Omit<BotSettings, 'id' | 'updated_at' | 'updated_by'>>) => Promise<void>
}

export function BotSettingsForm({ initial, onSave }: Props) {
  const [form, setForm] = useState({
    model:         initial.model,
    system_prompt: initial.system_prompt,
    max_tokens:    initial.max_tokens,
    temperature:   initial.temperature,
    daily_limit:   initial.daily_limit,
    history_count: initial.history_count,
    kb_top_k:      initial.kb_top_k,
    similarity_thr: initial.similarity_thr,
    fallback_msg:  initial.fallback_msg,
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      setSaved(true)
    } catch (err: any) {
      setError(err.message ?? 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Модель ── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Модель</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVAILABLE_MODELS.map(m => (
            <label
              key={m.value}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                form.model === m.value
                  ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={m.value}
                checked={form.model === m.value}
                onChange={() => set('model', m.value)}
                className="accent-zinc-900 dark:accent-zinc-100"
              />
              <span className="text-sm">{m.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Системный промт ── */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Системный промт</h3>
        <textarea
          value={form.system_prompt}
          onChange={e => set('system_prompt', e.target.value)}
          rows={9}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-y font-mono"
          placeholder="Ты — помощник службы поддержки..."
        />
      </section>

      {/* ── Параметры генерации ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Параметры генерации</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <label>Температура</label>
              <span className="font-mono">{form.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range" min={0} max={2} step={0.05}
              value={form.temperature}
              onChange={e => set('temperature', parseFloat(e.target.value))}
              className="w-full accent-zinc-900 dark:accent-zinc-100"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Точнее</span><span>Креативнее</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Макс. токенов в ответе</label>
            <input
              type="number" min={50} max={4000} step={50}
              value={form.max_tokens}
              onChange={e => set('max_tokens', parseInt(e.target.value))}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
        </div>
      </section>

      {/* ── Контекст и история ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Контекст и история</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">Сообщений истории</label>
            <input
              type="number" min={0} max={50}
              value={form.history_count}
              onChange={e => set('history_count', parseInt(e.target.value))}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <p className="text-[10px] text-zinc-400">Сколько прошлых сообщений передавать в контекст</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-zinc-500">База знаний: топ-K</label>
            <input
              type="number" min={0} max={20}
              value={form.kb_top_k}
              onChange={e => set('kb_top_k', parseInt(e.target.value))}
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <p className="text-[10px] text-zinc-400">Сколько записей KB подмешивать в запрос</p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <label>Порог схожести KB</label>
              <span className="font-mono">{form.similarity_thr.toFixed(2)}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05}
              value={form.similarity_thr}
              onChange={e => set('similarity_thr', parseFloat(e.target.value))}
              className="w-full accent-zinc-900 dark:accent-zinc-100"
            />
            <p className="text-[10px] text-zinc-400">Минимальная косинусная близость для включения записи</p>
          </div>
        </div>
      </section>

      {/* ── Лимиты ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Лимиты</h3>
        <div className="max-w-xs space-y-1">
          <label className="block text-xs text-zinc-500">Дневной лимит вызовов AI</label>
          <input
            type="number" min={1} max={10000}
            value={form.daily_limit}
            onChange={e => set('daily_limit', parseInt(e.target.value))}
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <p className="text-[10px] text-zinc-400">При достижении лимита бот отправляет fallback-сообщение</p>
        </div>
      </section>

      {/* ── Fallback ── */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fallback-сообщение</h3>
        <p className="text-xs text-zinc-500">Отправляется пользователю если AI недоступен или превышен дневной лимит</p>
        <textarea
          value={form.fallback_msg}
          onChange={e => set('fallback_msg', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
        />
      </section>

      {/* ── Действия ── */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
        {saved && !error && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Сохранено</span>
        )}
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </form>
  )
}
