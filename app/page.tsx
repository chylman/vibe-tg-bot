export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "../lib/supabaseServer"; // async
import { SignOutButton } from "./signinout";
import Chat from '@/app/chat/[chatId]/Chat'

// Server Component: split view (chats list + active chat)
export default async function MessagesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login')

  // Aggregate chats by last activity from messages
  const { data: chats, error: chatsError } = await supabase
    .from('messages')
    .select('telegram_chat_id, last_at:max(created_at)')
    .not('telegram_chat_id', 'is', null)
    .group('telegram_chat_id')
    .order('last_at', { ascending: false })

  // Determine selected chatId from URL or default to most recent
  const qp = searchParams || {}
  const qpChatId = typeof qp.chatId === 'string' ? qp.chatId : Array.isArray(qp.chatId) ? qp.chatId[0] : undefined
  const firstChatId = (chats && chats.length > 0) ? String(chats[0].telegram_chat_id) : undefined
  const activeChatId = (qpChatId && qpChatId !== 'undefined' && qpChatId !== 'null') ? qpChatId : firstChatId

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-semibold">BotAdminPanel — Чаты</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span>{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-3 overflow-y-auto">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Чаты</div>
          {chatsError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              Не удалось загрузить список чатов: {chatsError.message}
            </div>
          )}
          {!chatsError && (!chats || chats.length === 0) && (
            <div className="text-sm text-zinc-600">Пока нет чатов</div>
          )}
          <ul className="space-y-1">
            {(chats || []).map((c: any) => {
              const id = String(c.telegram_chat_id)
              const isActive = id === activeChatId
              const last = c.last_at ? new Date(c.last_at) : null
              const when = last && !isNaN(last.getTime())
                ? last.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <li key={id}>
                  <a
                    href={`/?chatId=${encodeURIComponent(id)}`}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${isActive ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <span className="truncate" title={id}>Chat {id}</span>
                    <span className={`ml-3 shrink-0 text-[10px] ${isActive ? 'opacity-90' : 'text-zinc-500'}`}>{when}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* Active chat */}
        <section className="flex-1 min-w-0 p-3">
          {!activeChatId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-zinc-600">Выберите чат слева, чтобы начать переписку.</div>
            </div>
          )}
          {activeChatId && (
            <div className="h-full">
              {/* Reuse the existing Chat component */}
              {/* @ts-expect-error Server-to-Client import path with dynamic segment is intentional */}
              <Chat chatId={activeChatId} adminEmail={user.email ?? ''} adminId={user.id} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
