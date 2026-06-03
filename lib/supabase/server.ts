import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  // cookies() is a dynamic function and must be called inside a
  // Server Component, Server Action, or Route Handler.
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          // setAll is called when the session is refreshed.
          // In Server Components the response headers are read-only, so
          // this may throw — we silence that error because the middleware
          // already handles writing the refreshed token to the browser.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Intentionally ignored in Server Components.
          }
        },
      },
    }
  )
}
