'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { KnowledgeEntry } from '../model/types'

export function useKnowledgeBase(initialEntries?: KnowledgeEntry[]) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries ?? [])
  const [loading, setLoading] = useState(!initialEntries)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('knowledge_base')
      .select('id, question, answer, category, is_active, created_at, created_by')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setEntries((data ?? []) as KnowledgeEntry[])
    setLoading(false)
  }

  useEffect(() => { if (!initialEntries) load() }, [])

  return { entries, setEntries, loading, error, reload: load }
}
