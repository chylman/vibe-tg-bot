import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import { AppNav } from '@/widgets/app-nav/ui/AppNav'
import TicketsClient from '@/widgets/tickets/ui/TicketsClient'

export const dynamic = 'force-dynamic'

export default async function TicketsPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav email={user.email ?? ''} active="/tickets" />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-xl font-semibold mb-6">Тикеты</h1>
        <TicketsClient adminId={user.id} />
      </main>
    </div>
  )
}
