import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import TicketsClient from '@/widgets/tickets/ui/TicketsClient'
import type { Ticket } from '@/entities/ticket/model/types'

export const dynamic = 'force-dynamic'

export default async function TicketsPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('tickets')
    .select('id, title, description, due_at, status, priority, telegram_chat_id, created_at')
    .order('due_at', { ascending: true, nullsFirst: false })

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold mb-6">Тикеты</h1>
      <TicketsClient adminId={user.id} initialTickets={(data ?? []) as Ticket[]} />
    </main>
  )
}
