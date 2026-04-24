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

  useEffect(() => {
    load()

    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets(prev => {
            const t = payload.new as Ticket
            const inserted = [...prev, t].sort((a, b) => {
              if (!a.due_at && !b.due_at) return 0
              if (!a.due_at) return 1
              if (!b.due_at) return -1
              return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
            })
            return inserted
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets(prev => prev.map(t => t.id === (payload.new as Ticket).id ? payload.new as Ticket : t))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets(prev => prev.filter(t => t.id !== (payload.old as Ticket).id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { tickets, setTickets, loading, error, reload: load }
}
