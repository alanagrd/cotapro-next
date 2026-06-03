import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  // Use getSession() — reads from cookie without a remote API call.
  // getUser() validates remotely and can fail during token refresh,
  // causing a spurious redirect back to /login.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) redirect('/login')

  const userId = session.user.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return (
    /*
     * Use explicit inline styles in addition to Tailwind classes.
     * This guarantees the flex layout even if Tailwind's JIT/purge
     * doesn't detect the class names inside the (app) route group.
     */
    <div
      className="flex h-screen overflow-hidden"
      style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}
    >
      {/* Sidebar — fixed width column */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Sidebar plano={profile?.plano ?? 'free'} />
      </div>

      {/* Main area — grows to fill remaining width */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
      >
        <Topbar profile={profile} />
        <main
          className="flex-1 overflow-y-auto bg-slate-50"
          style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8fafc' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
