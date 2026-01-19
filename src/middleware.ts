import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    // Auth routes (handled by Auth0)
    '/auth/:path*',
    // Protected routes (tokens with project ID, not base /tokens which is demo mode)
    '/tokens/:projectId/:path*',
    '/projects/:path*',
    '/teams/:path*',
    '/dashboard/:path*',
    // Protected API routes (exclude auth endpoints)
    '/api/((?!auth).*)',
  ],
};
