import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role

  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.url))
    if (role !== 'ADMIN') return NextResponse.redirect(new URL('/', req.url))
  }

  const protectedPaths = ['/profile', '/saved', '/recommend']
  if (!isLoggedIn && protectedPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
})

export const config = {
  matcher: ['/profile/:path*', '/saved/:path*', '/recommend/:path*', '/admin/:path*'],
}
