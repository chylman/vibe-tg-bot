export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import Chat from '@/app/(app)/chat/[chatId]/Chat'
import ChatSidebar from '@/widgets/chat-sidebar/ui/ChatSidebar'
import { ChatSkeleton } from '@/widgets/chat-sidebar/ui/ChatSkeleton'

export default async function ChatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clientRows, error: chatsError } = await supabase
    .from('clients')
    .select('telegram_chat_id, last_seen_at, username')
    .order('last_seen_at', { ascending: false })
    .limit(200)

  const chats: { telegram_chat_id: any; last_at: string; username: string | null }[] = (clientRows ?? []).map((c) => ({
    telegram_chat_id: c.telegram_chat_id,
    last_at: c.last_seen_at,
    username: c.username ?? null,
  }))

  const { data: rows } = await supabase
    .from('messages')
    .select('telegram_chat_id, created_at')
    .eq('sender', 'user')
    .order('created_at', { ascending: false })
    .limit(500)

  const qp = (await searchParams) || {}
  const qpChatId =
    typeof qp.chatId === 'string' ? qp.chatId : Array.isArray(qp.chatId) ? qp.chatId[0] : undefined
  const firstChatId = chats.length > 0 ? String(chats[0].telegram_chat_id) : undefined
  const activeChatId =
    qpChatId && qpChatId !== 'undefined' && qpChatId !== 'null' ? qpChatId : firstChatId

  return (
    <main className="flex-1 flex min-h-0 overflow-hidden">
        <ChatSidebar
          chats={chats}
          allRows={(rows ?? []) as { telegram_chat_id: any; created_at: string }[]}
          activeChatId={activeChatId}
          chatsError={chatsError?.message ?? null}
          linkBase="/chats"
        />

        <section className="flex-1 min-w-0 p-3">
          {!activeChatId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-zinc-600">Выберите чат слева, чтобы начать переписку.</div>
            </div>
          )}
          {activeChatId && (
            <div className="h-full">
              <Suspense fallback={<ChatSkeleton />}>
                <Chat chatId={activeChatId} adminEmail={user.email ?? ''} adminId={user.id} />
              </Suspense>
            </div>
          )}
        </section>
    </main>
  )
}
