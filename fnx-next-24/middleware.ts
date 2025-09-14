import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has('auth');

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If trying to access a protected route without being authenticated
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If trying to access login/register while authenticated
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}