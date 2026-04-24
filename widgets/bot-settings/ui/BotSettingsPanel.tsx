'use client'

import { useBotSettings } from '@/entities/bot-settings/api/use-bot-settings'
import { BotSettingsForm } from '@/features/update-bot-settings/ui/BotSettingsForm'
import { formatDateTime } from '@/shared/lib/format-date'
import type { BotSettings } from '@/entities/bot-settings/model/types'

export function BotSettingsPanel({ adminId, initialSettings }: { adminId: string; initialSettings?: BotSettings | null }) {
  const { settings, loading, error, save } = useBotSettings(initialSettings)

  if (loading) {
    return <div className="py-12 text-center text-sm text-zinc-500">Загрузка настроек…</div>
  }

  if (error || !settings) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || 'Не удалось загрузить настройки'}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {settings.updated_at && (
        <p suppressHydrationWarning className="text-xs text-zinc-400 text-right">
          Последнее изменение: {formatDateTime(settings.updated_at)}
        </p>
      )}
      <BotSettingsForm
        initial={settings}
        onSave={(patch) => save(patch, adminId)}
      />
    </div>
  )
}
