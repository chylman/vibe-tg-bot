import type { Database } from '@/shared/api/database.types'

type TicketStatus   = Database['public']['Enums']['ticket_status']
type TicketPriority = Database['public']['Enums']['ticket_priority']

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open:        'Открыт',
  in_progress: 'В работе',
  closed:      'Закрыт',
}

export const STATUS_STYLE: Record<TicketStatus, string> = {
  open:        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  closed:      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

export const STATUS_NEXT: Record<TicketStatus, TicketStatus> = {
  open:        'in_progress',
  in_progress: 'closed',
  closed:      'open',
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low:    'Низкий',
  normal: 'Обычный',
  high:   'Высокий',
}

export const PRIORITY_STYLE: Record<TicketPriority, string> = {
  low:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// Pagination
export const CHAT_PAGE_SIZE = 50
