'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase-client'
import type { BotSettings } from '../model/types'

export function useBotSettings() {
  const [settings, setSettings] = useState<BotSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('bot_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSettings(data as BotSettings)
        setLoading(false)
      })
  }, [])

  async function save(patch: Partial<Omit<BotSettings, 'id' | 'updated_at' | 'updated_by'>>, adminId: string) {
    const { data, error } = await supabase
      .from('bot_settings')
      .update({ ...patch, updated_at: new Date().toISOString(), updated_by: adminId })
      .eq('id', 1)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    setSettings(data as BotSettings)
  }

  return { settings, loading, error, save }
}
