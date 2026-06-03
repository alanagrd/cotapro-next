import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static files and API routes
  // (the matcher below already excludes _next/static etc.)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          // 1. Write cookies onto the request so downstream middleware/server
          //    components see the refreshed session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 2. Create a fresh response that carries the updated cookies back
          //    to the browser.
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() validates the JWT with Supabase Auth server.
  // Wrap in try/catch so a network error never blocks the page.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // If Supabase is unreachable, let the request through — the server
    // component will handle the empty-session case.
  }

  // ── Redirect unauthenticated users to /login ──────────────────────────
  if (!user && !isAuthRoute(pathname)) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination so we can redirect after login
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirectTo', pathname)
    }
    const redirectResponse = NextResponse.redirect(loginUrl)
    // Forward any Set-Cookie headers so the session refresh still works
    supabaseResponse.cookies.getAll().forEach(c =>
      redirectResponse.cookies.set(c.name, c.value, c)
    )
    return redirectResponse
  }

  // ── Redirect authenticated users away from auth pages ────────────────
  // Only redirect from the exact auth route (not nested paths) to avoid
  // accidentally blocking password-reset callbacks.
  if (user && isAuthRoute(pathname)) {
    const dashboardUrl = new URL('/dashboard', request.url)
    const redirectResponse = NextResponse.redirect(dashboardUrl)
    supabaseResponse.cookies.getAll().forEach(c =>
      redirectResponse.cookies.set(c.name, c.value, c)
    )
    return redirectResponse
  }

  // Return supabaseResponse so Set-Cookie headers reach the browser
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (Next.js image optimisation)
     *  - favicon.ico
     *  - common image extensions
     *  - /api routes (handle auth separately if needed)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
