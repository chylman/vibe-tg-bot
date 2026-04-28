export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import { BotSettingsPanel } from '@/widgets/bot-settings/ui/BotSettingsPanel'
import type { BotSettings } from '@/entities/bot-settings/model/types'

export default async function SettingsPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('id', 1)
    .single()

  return (
    <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Настройки бота</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Параметры AI-модели, системный промт и лимиты автоответа.
          </p>
        </div>
        <BotSettingsPanel adminId={user.id} initialSettings={data as BotSettings | null} />
    </main>
  )
}
