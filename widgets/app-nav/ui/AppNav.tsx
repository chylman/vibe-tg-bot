import Link from 'next/link'
import { signOut } from '@/app/actions/auth'

const NAV_LINKS = [
  { href: '/',                label: 'Главная'      },
  { href: '/chats',           label: 'Чаты'         },
  { href: '/tickets',         label: 'Тикеты'       },
  { href: '/knowledge-base',  label: 'База знаний'  },
  { href: '/settings',        label: 'Настройки'    },
]

export function AppNav({ email, active }: { email: string; active: string }) {
  return (
    <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-sm">SupportBot</span>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                active === l.href
                  ? 'font-medium text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors'
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm text-zinc-600">
        <span className="hidden sm:inline">{email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Выйти
          </button>
        </form>
      </div>
    </header>
  )
}
