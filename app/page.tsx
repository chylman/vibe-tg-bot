export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "../lib/supabaseServer"; // async
import { SignOutButton } from "./signinout";
import Chat from '@/app/chat/[chatId]/Chat'
import ChatSidebar from './ChatSidebar'

// Server Component: split view (chats list + active chat)
export default async function MessagesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login')

  // Chat list from clients table — already one row per chat with last_seen_at
  const { data: clientRows, error: chatsError } = await supabase
    .from('clients')
    .select('telegram_chat_id, last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(200)

  const chats: { telegram_chat_id: any; last_at: string }[] = (clientRows ?? []).map((c) => ({
    telegram_chat_id: c.telegram_chat_id,
    last_at: c.last_seen_at,
  }))

  // Recent user messages for unread count computation in the sidebar
  const { data: rows } = await supabase
    .from('messages')
    .select('telegram_chat_id, created_at')
    .eq('sender', 'user')
    .order('created_at', { ascending: false })
    .limit(500)

  // Determine selected chatId from URL or default to most recent
  const qp = (await searchParams) || {}
  const qpChatId = typeof qp.chatId === 'string' ? qp.chatId : Array.isArray(qp.chatId) ? qp.chatId[0] : undefined
  const firstChatId = (chats && chats.length > 0) ? String(chats[0].telegram_chat_id) : undefined
  const activeChatId = (qpChatId && qpChatId !== 'undefined' && qpChatId !== 'null') ? qpChatId : firstChatId

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-semibold">BotAdminPanel — Чаты</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span>{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        <ChatSidebar
          chats={chats}
          allRows={(rows ?? []) as { telegram_chat_id: any; created_at: string }[]}
          activeChatId={activeChatId}
          chatsError={chatsError?.message ?? null}
        />

        {/* Active chat */}
        <section className="flex-1 min-w-0 p-3">
          {!activeChatId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-zinc-600">Выберите чат слева, чтобы начать переписку.</div>
            </div>
          )}
          {activeChatId && (
            <div className="h-full">
              <Chat chatId={activeChatId} adminEmail={user.email ?? ''} adminId={user.id} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
