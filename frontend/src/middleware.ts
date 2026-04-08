import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that are fully public (no auth required)
const PUBLIC_PATHS = ['/', '/login'];

/**
 * Edge middleware that enforces authentication and the forced password-change redirect.
 * - Unauthenticated requests to protected routes are redirected to /login.
 * - Authenticated users who must change their password are redirected to /change-password.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p)))) {
    // Redirect logged-in users away from login page only
    if (pathname === '/login' && accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Allow the change-password page only for authenticated users
  if (pathname.startsWith('/change-password')) {
    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
