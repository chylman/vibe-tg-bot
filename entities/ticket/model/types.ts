import type { Database } from '@/shared/api/database.types'

export type Ticket = {
  id: string
  title: string
  description: string | null
  due_at: string | null
  status: Database['public']['Enums']['ticket_status']
  priority: Database['public']['Enums']['ticket_priority']
  telegram_chat_id: number | null
  created_at: string
}
