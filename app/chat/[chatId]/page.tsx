import { getSupabaseServer } from '@/shared/api/supabase-server'
import { redirect } from 'next/navigation'
import { AppNav } from '@/app/AppNav'
import Chat from './Chat'

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { chatId } = await params

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppNav email={user.email ?? ''} active="/chats" />
      <main className="flex-1 flex flex-col min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">
        <div className="mb-3 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold">Чат с пользователем</h1>
          <span className="text-sm text-zinc-500">ID: {chatId}</span>
        </div>
        <Chat chatId={chatId} adminEmail={user.email ?? ''} adminId={user.id} />
      </main>
    </div>
  )
}
