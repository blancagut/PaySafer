import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Helper: create a redirect that preserves Supabase auth cookies.
  // Without this, token refreshes and signOut cookie changes are lost,
  // which causes stale sessions and infinite redirect loops.
  function redirectWithCookies(url: URL) {
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirect
  }

  // Protected routes - redirect to login if not authenticated
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/register') &&
    !request.nextUrl.pathname.startsWith('/forgot-password') &&
    !request.nextUrl.pathname.startsWith('/reset-password') &&
    !request.nextUrl.pathname.startsWith('/auth/callback') &&
    !request.nextUrl.pathname.startsWith('/offer/') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithCookies(url)
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register') ||
      request.nextUrl.pathname === '/')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return redirectWithCookies(url)
  }

  // Block banned users — force sign out and redirect
  // Only run on dashboard routes to avoid slowing down every request
  if (user && request.nextUrl.pathname.startsWith('/dashboard') || 
      user && request.nextUrl.pathname.startsWith('/admin') ||
      user && request.nextUrl.pathname.startsWith('/transactions') ||
      user && request.nextUrl.pathname.startsWith('/wallet') ||
      user && request.nextUrl.pathname.startsWith('/analytics') ||
      user && request.nextUrl.pathname.startsWith('/disputes') ||
      user && request.nextUrl.pathname.startsWith('/offers') ||
      user && request.nextUrl.pathname.startsWith('/payouts') ||
      user && request.nextUrl.pathname.startsWith('/services') ||
      user && request.nextUrl.pathname.startsWith('/profile') ||
      user && request.nextUrl.pathname.startsWith('/settings')) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Only ban if we got a definitive 'banned' role — never block on query errors
      if (!profileError && profile?.role === 'banned') {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('banned', '1')
        return redirectWithCookies(url)
      }
    } catch {
      // If profile query fails, let the user through — don't block on DB errors
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
