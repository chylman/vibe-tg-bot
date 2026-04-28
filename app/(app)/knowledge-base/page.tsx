import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import KnowledgeBaseClient from '@/widgets/knowledge-base/ui/KnowledgeBaseClient'
import type { KnowledgeEntry } from '@/entities/knowledge-entry/model/types'

export const dynamic = 'force-dynamic'

export default async function KnowledgeBasePage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('knowledge_base')
    .select('id, question, answer, category, is_active, created_at, created_by')
    .order('created_at', { ascending: false })

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">База знаний</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ответы на типичные вопросы. Бот использует их при автоответе через векторный поиск.
        </p>
      </div>
      <KnowledgeBaseClient adminId={user.id} initialEntries={(data ?? []) as KnowledgeEntry[]} />
    </main>
  )
}
