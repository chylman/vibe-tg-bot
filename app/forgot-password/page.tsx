import Link from 'next/link'
import ForgotForm from './send-form'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Восстановление пароля</h1>
          <p className="text-sm text-zinc-600 mt-1">Укажите email для отправки ссылки</p>
        </div>
        <ForgotForm />
        <div className="mt-6 text-center text-sm text-zinc-600">
          <Link className="hover:underline" href="/login">Вернуться ко входу</Link>
        </div>
      </div>
    </div>
  )
}
