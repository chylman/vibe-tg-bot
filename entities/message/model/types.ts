import type { Database } from '@/shared/api/database.types'

export type MessageSender = Database['public']['Enums']['message_sender']

export type Msg = {
  id: string
  stableId?: string
  text: string | null
  created_at: string
  sender: MessageSender
  telegram_chat_id?: string | number | null
  admin_uid?: string | null
  status?: string | null
  sent_at?: string | null
}
