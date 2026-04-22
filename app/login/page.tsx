import LoginForm from './LoginForm'
import Link from 'next/link'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Вход в админ-панель</h1>
          <p className="text-sm text-zinc-600 mt-1">Введите email и пароль</p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center text-sm text-zinc-600">
          <Link className="hover:underline" href="/">На главную</Link>
        </div>
      </div>
    </div>
  )
}
