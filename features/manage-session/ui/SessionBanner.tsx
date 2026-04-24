'use client'

import type { ChatSession } from '@/entities/chat/model/types'

type Props = {
  sessionLoading: boolean
  session: ChatSession | null
  sessionError: string
  sessionWorking: boolean
  wasForceDisconnected: boolean
  isMySession: boolean
  onConnect: () => void
  onDisconnect: () => void
  onForceDisconnect: () => void
  onDismissForceDisconnected: () => void
}

export function SessionBanner({
  sessionLoading,
  session,
  sessionError,
  sessionWorking,
  wasForceDisconnected,
  isMySession,
  onConnect,
  onDisconnect,
  onForceDisconnect,
  onDismissForceDisconnected,
}: Props) {
  return (
    <>
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between gap-3 min-h-[44px]">
        {sessionLoading ? (
          <span className="text-xs text-zinc-400">Загрузка состояния чата…</span>
        ) : isMySession ? (
          <>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              ● Вы подключены к чату
            </span>
            <button
              onClick={onDisconnect}
              disabled={sessionWorking}
              className="text-xs rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              {sessionWorking ? 'Отключение…' : 'Отключиться'}
            </button>
          </>
        ) : session ? (
          <>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ● Подключён: {session.managers?.name ?? 'другой менеджер'}
            </span>
            <button
              onClick={onForceDisconnect}
              disabled={sessionWorking}
              className="text-xs rounded-md border border-red-300 text-red-600 px-3 py-1 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
            >
              {sessionWorking ? 'Отключение…' : 'Отключить менеджера'}
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-zinc-500">
              ○ Чат не обслуживается — бот отвечает автоматически
            </span>
            <button
              onClick={onConnect}
              disabled={sessionWorking}
              className="text-xs rounded-md bg-black text-white px-3 py-1 hover:opacity-90 dark:bg-white dark:text-black disabled:opacity-50"
            >
              {sessionWorking ? 'Подключение…' : 'Подключиться к чату'}
            </button>
          </>
        )}
      </div>

      {wasForceDisconnected && (
        <div className="mx-4 mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex items-center justify-between">
          <span>Вы были отключены от чата другим менеджером.</span>
          <button
            onClick={onDismissForceDisconnected}
            className="ml-3 text-red-500 hover:text-red-700 font-bold leading-none"
          >
            ×
          </button>
        </div>
      )}

      {sessionError && (
        <div className="mx-4 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {sessionError}
        </div>
      )}
    </>
  )
}
