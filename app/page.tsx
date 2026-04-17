export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '../lib/supabaseServer'
import { AppNav } from './AppNav'
import DashboardChatsPreview from './DashboardChatsPreview'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  closed: 'Закрыт',
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  closed: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-zinc-100 text-zinc-500',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default async function DashboardPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Manager profile
  const { data: manager } = await supabase
    .from('managers')
    .select('name, created_at')
    .eq('user_id', user.id)
    .single()

  // Active sessions for this manager (can be multiple)
  const { data: activeSessions } = await supabase
    .from('chat_sessions')
    .select('telegram_chat_id, connected_at')
    .eq('manager_id', user.id)
    .order('connected_at', { ascending: false })

  // Chats preview via view (last 8, sorted by last message)
  const { data: chatsPreview } = await (supabase as any)
    .from('clients_with_last_message')
    .select('telegram_chat_id, username, last_message_text, last_message_sender, last_message_at')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(8)

  // Recent user messages for unread count
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('telegram_chat_id, created_at')
    .eq('sender', 'user')
    .order('created_at', { ascending: false })
    .limit(500)

  // Upcoming open tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, title, description, due_at, status, priority, telegram_chat_id')
    .neq('status', 'closed')
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(5)

  const memberSince = manager?.created_at
    ? new Date(manager.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav email={user.email ?? ''} active="/" />

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* Manager card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Добро пожаловать{manager?.name ? `, ${manager.name}` : ''}!
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>
            {memberSince && (
              <p className="text-xs text-zinc-400 mt-1">Менеджер с {memberSince}</p>
            )}
          </div>

          {activeSessions && activeSessions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeSessions.map((s: any) => (
                <Link
                  key={s.telegram_chat_id}
                  href={`/chats?chatId=${s.telegram_chat_id}`}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-3 py-2 text-sm hover:opacity-80 transition-opacity"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Чат {s.telegram_chat_id}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-sm text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              Нет активных чатов
            </div>
          )}
        </div>

        {/* Two-column grid: chats | tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Chats preview — wider column */}
          <div className="lg:col-span-3">
            <DashboardChatsPreview
              chats={(chatsPreview ?? []) as any[]}
              allRows={(recentMessages ?? []) as { telegram_chat_id: any; created_at: string }[]}
            />
          </div>

          {/* Upcoming tickets */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold text-sm">Предстоящие тикеты</h2>
                <Link
                  href="/tickets"
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Все тикеты →
                </Link>
              </div>

              {!tickets || tickets.length === 0 ? (
                <div className="px-4 py-8 text-sm text-zinc-500 text-center">
                  Нет предстоящих тикетов
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {tickets.map((t: any) => {
                    const isOverdue = t.due_at && new Date(t.due_at) < new Date()
                    return (
                      <li key={t.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            {t.due_at && (
                              <p suppressHydrationWarning className={`text-[11px] mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                                {isOverdue ? 'Просрочен: ' : 'Срок: '}
                                {new Date(t.due_at).toLocaleString('ru-RU', {
                                  day: '2-digit', month: '2-digit',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status] ?? ''}`}>
                              {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                            {t.priority !== 'normal' && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[t.priority] ?? ''}`}>
                                {t.priority === 'high' ? 'Высокий' : 'Низкий'}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <Link
                  href="/tickets"
                  className="block w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-center text-xs text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  + Создать тикет
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
