import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PROTECTED = ['/admin', '/profile', '/saved', '/recommend']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/saved/:path*', '/recommend/:path*'],
}
