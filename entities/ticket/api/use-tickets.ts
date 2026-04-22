'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { Ticket } from '../model/types'

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('tickets')
      .select('id, title, description, due_at, status, priority, telegram_chat_id, created_at')
      .order('due_at', { ascending: true, nullsFirst: false })
    if (err) setError(err.message)
    else setTickets((data ?? []) as Ticket[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { tickets, setTickets, loading, error, reload: load }
}
