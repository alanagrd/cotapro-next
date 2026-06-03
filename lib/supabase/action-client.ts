'use server'
/**
 * Shared helper for Server Actions.
 *
 * WHY getSession() instead of getUser():
 * - getUser()    → validates JWT against Supabase Auth SERVER (network call).
 *                  Fails when called from a Server Action in some edge cases
 *                  (token refresh race, cookie propagation timing, etc.)
 * - getSession() → reads the JWT from the COOKIE directly (no network call).
 *                  Works reliably in Server Actions because the session cookie
 *                  is always present if the user is logged in.
 *
 * Security: Row Level Security on every table ensures users can only read/
 * write their own rows even if user_id were somehow spoofed.
 */
import { createClient } from './server'

export async function getActionUser() {
  const supabase = createClient()

  // Read session from cookie — no external API call needed
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session?.user) {
    return { supabase, userId: null as unknown as string, error: 'Sessão expirada. Faça login novamente.' }
  }

  return { supabase, userId: session.user.id, error: null }
}
