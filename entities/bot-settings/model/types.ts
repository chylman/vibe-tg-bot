export type BotSettings = {
  id: number
  model: string
  system_prompt: string
  max_tokens: number
  temperature: number
  daily_limit: number
  history_count: number
  kb_top_k: number
  similarity_thr: number
  fallback_msg: string
  updated_at: string
  updated_by: string | null
}

export const AVAILABLE_MODELS = [
  { value: 'deepseek-chat',     label: 'DeepSeek Chat (V3)'     },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
] as const
