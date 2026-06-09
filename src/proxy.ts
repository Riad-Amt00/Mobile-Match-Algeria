import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Proxy — uses next-auth/jwt getToken to decrypt the JWT session.
 * Prisma is NOT used here (Edge runtime incompatible).
 *
 * Route protection:
 *  - /admin/*   → ADMIN role only
 *  - /profile   → authenticated users
 *  - /saved     → authenticated users
 *  - /login, /register → redirect if already logged in
 */
export async function proxy(req: NextRequest) {
  const { nextUrl } = req
  const path = nextUrl.pathname

  // getToken works in both Edge and Node runtimes and properly decrypts NextAuth JWTs.
  // The session cookie carries the __Secure- prefix only over HTTPS — NODE_ENV is the
  // wrong signal, because a production build served over plain HTTP (e.g. localhost)
  // sets the unprefixed 'authjs.session-token'. Detect whichever cookie is present so
  // auth works on both an HTTP localhost build and an HTTPS deployment.
  const secureName = '__Secure-authjs.session-token'
  const cookieName = req.cookies.has(secureName) ? secureName : 'authjs.session-token'
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: cookieName === secureName,
    cookieName,
  })

  const isLoggedIn = !!token
  const isAdmin = token?.role === 'ADMIN'

  // ── Route Guards ──────────────────────────────────────────────────────────

  // /admin – must be an ADMIN role
  if (path.startsWith('/admin')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', nextUrl))
    if (!isAdmin) return NextResponse.redirect(new URL('/', nextUrl))
  }

  // /profile, /saved, /recommend – must be logged in
  if (path.startsWith('/profile') || path.startsWith('/saved') || path.startsWith('/recommend')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', nextUrl)
      loginUrl.searchParams.set('callbackUrl', path)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect already-logged-in users away from login / register
  if (isLoggedIn && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/saved/:path*', '/recommend/:path*', '/login', '/register'],
}
