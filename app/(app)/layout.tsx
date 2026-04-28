import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/shared/api/supabase-server'
import { AppNav } from '@/widgets/app-nav/ui/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <AppNav email={user.email ?? ''} />
      {children}
    </>
  )
}
