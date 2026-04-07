'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<{ ok?: boolean; message: string }>({ message: '' })
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ message: '' })
    setLoading(true)

    try {
      const origin = window.location.origin
      const redirectTo = `${origin}/auth/callback`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        setState({ ok: false, message: error.message })
      } else {
        setState({ ok: true, message: 'Письмо для восстановления отправлено' })
      }
    } catch (err: any) {
      setState({ ok: false, message: err?.message || 'Не удалось отправить письмо' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {state.ok === false && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message || 'Не удалось отправить письмо'}
        </div>
      )}
      {state.ok === true && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.message || 'Проверьте почту'}
        </div>
      )}

      <button disabled={loading} type="submit" className="w-full rounded-md bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60">
        {loading ? 'Отправка…' : 'Отправить ссылку'}
      </button>
    </form>
  )
}
