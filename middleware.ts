import { NextRequest, NextResponse } from 'next/server';

// Simple middleware to protect routes
export function middleware(request: NextRequest) {
  // This is a placeholder middleware
  // In a real implementation, you would check for session/authorization here
  // For now, let's allow all requests to pass through to avoid build issues
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sign-in and sign-up (public auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up).*)',
  ],
};