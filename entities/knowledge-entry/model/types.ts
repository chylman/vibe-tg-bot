export type KnowledgeEntry = {
  id: string
  question: string
  answer: string
  category: string | null
  is_active: boolean
  created_at: string
  created_by: string | null
}
