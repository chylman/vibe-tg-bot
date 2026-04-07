'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [stage, setStage] = useState<'processing' | 'set-password' | 'done' | 'error'>('processing')
  const [message, setMessage] = useState<string>('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function handle() {
      try {
        // Try to exchange code/token in URL for a session (handles recovery links as well)
        // If method is not available in some versions, this call is safe to ignore errors.
        // @ts-ignore
        if (typeof supabase.auth.exchangeCodeForSession === 'function') {
          // @ts-ignore
          await supabase.auth.exchangeCodeForSession(window.location.href)
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setStage('error')
          setMessage('Не удалось установить сессию. Ссылка недействительна или устарела.')
          return
        }

        // After recovery link, Supabase sets a session that allows password update
        setStage('set-password')
      } catch (e: any) {
        setStage('error')
        setMessage(e?.message || 'Ошибка обработки ссылки')
      }
    }
    handle()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setStage('done')
    setTimeout(() => router.replace('/login'), 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {stage === 'processing' && (
          <div className="text-center text-zinc-600">Обработка ссылки…</div>
        )}
        {stage === 'error' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message || 'Ошибка'}
          </div>
        )}
        {stage === 'set-password' && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">Установка нового пароля</h1>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">Новый пароль</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
              {message && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>
              )}
              <button disabled={loading} type="submit" className="w-full rounded-md bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60">
                {loading ? 'Сохранение…' : 'Сохранить пароль'}
              </button>
            </form>
          </div>
        )}
        {stage === 'done' && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Пароль изменён. Перенаправляем…
          </div>
        )}
      </div>
    </div>
  )
}
