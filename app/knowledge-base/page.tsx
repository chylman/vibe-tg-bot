import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { AppNav } from '../AppNav'
import KnowledgeBaseClient from './KnowledgeBaseClient'

export const dynamic = 'force-dynamic'

export default async function KnowledgeBasePage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav email={user.email ?? ''} active="/knowledge-base" />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">База знаний</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Ответы на типичные вопросы. Бот использует их при автоответе через векторный поиск.
          </p>
        </div>
        <KnowledgeBaseClient adminId={user.id} />
      </main>
    </div>
  )
}
