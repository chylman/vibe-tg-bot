'use client'

import { useFormState } from 'react-dom'
import { sendReset } from '@/app/actions/auth'

const initialState = { ok: undefined as undefined | boolean, message: '' }

export default function ForgotForm() {
  const [state, action] = useFormState(sendReset as any, initialState)

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

      {state?.ok === false && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message || 'Не удалось отправить письмо'}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.message || 'Проверьте почту'}
        </div>
      )}

      <button type="submit" className="w-full rounded-md bg-black px-4 py-2 text-white hover:opacity-90">
        Отправить ссылку
      </button>
    </form>
  )
}
