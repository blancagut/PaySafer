import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { apiLimiter, authLimiter, aiLimiter } from '@/lib/rate-limit'

// ─── Rate Limit Helper ───
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    '127.0.0.1'
  )
}

function rateLimitResponse(reset: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(reset),
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)

  // ─── Rate limit API routes ───
  if (pathname.startsWith('/api/')) {
    // Auth-related endpoints: strict limit (5/min)
    if (pathname.startsWith('/api/auth')) {
      const { success, reset } = authLimiter.check(`auth:${ip}`, 5)
      if (!success) return rateLimitResponse(reset)
    }
    // AI endpoints: moderate limit (10/min)
    else if (pathname.startsWith('/api/ai')) {
      const { success, reset } = aiLimiter.check(`ai:${ip}`, 10)
      if (!success) return rateLimitResponse(reset)
    }
    // Webhooks: skip rate limiting (Stripe has own protections)
    else if (pathname.startsWith('/api/webhooks')) {
      // No rate limiting for webhook endpoints
    }
    // All other API routes: general limit (60/min)
    else {
      const { success, reset } = apiLimiter.check(`api:${ip}`, 60)
      if (!success) return rateLimitResponse(reset)
    }
  }

  // ─── Auth rate limiting for login/register pages (form submissions) ───
  if (
    (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password') &&
    request.method === 'POST'
  ) {
    const { success, reset } = authLimiter.check(`page-auth:${ip}`, 5)
    if (!success) return rateLimitResponse(reset)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
