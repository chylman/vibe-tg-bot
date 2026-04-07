'use client'

import { useFormState } from 'react-dom'
import { signIn } from '@/app/actions/auth'
import Link from 'next/link'

const initialState = { ok: undefined as undefined | boolean, message: '' }

export default function LoginForm() {
  const [state, action] = useFormState(signIn as any, initialState)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="••••••••"
        />
      </div>

      {state?.ok === false && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message || 'Ошибка авторизации'}
        </div>
      )}

      <button type="submit" className="w-full rounded-md bg-black px-4 py-2 text-white hover:opacity-90">
        Войти
      </button>

      <div className="text-sm text-zinc-600">
        <Link href="/forgot-password" className="hover:underline">Забыли пароль?</Link>
      </div>
    </form>
  )
}
