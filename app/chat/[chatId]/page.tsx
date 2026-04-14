import { getSupabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Chat from './Chat'

export default async function ChatPage({ params }: { params: { chatId: string } }) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chatId = params.chatId

  return (
    <div className="h-screen flex flex-col items-center px-4 py-6 overflow-hidden">
      <main className="w-full max-w-3xl flex flex-col flex-1 min-h-0">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-semibold">Чат с пользователем</h1>
          <div className="text-sm text-zinc-600">Telegram Chat ID: {chatId}</div>
        </div>
        <Chat chatId={chatId} adminEmail={user.email ?? ''} adminId={user.id} />
      </main>
    </div>
  )
}
