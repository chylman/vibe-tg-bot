export type ChatSession = {
  telegram_chat_id: number
  manager_id: string
  connected_at: string
  managers?: { name: string } | null
}

export type ChatItem = {
  telegram_chat_id: any
  last_at: string
  username?: string | null
}

export type MessageRow = {
  telegram_chat_id: any
  created_at: string
}

export type ChatPreviewRow = {
  telegram_chat_id: any
  username: string | null
  last_message_text: string | null
  last_message_sender: string | null
  last_message_at: string | null
}
