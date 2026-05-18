import { NextRequest, NextResponse } from 'next/server';

// Routen die OHNE Login zugänglich sind
const PUBLIC_PATHS = [
  '/landing',
  '/auth',
  '/impressum',
  '/privacy',
  '/terms',
  '/agb',
  '/about',
  '/contact',
  '/sitemap.xml',
  '/robots.txt',
  '/strains',
  '/prices',
  '/grows',
  '/seedbanks',
  '/community',
  '/search',
  '/leaderboard',
  '/tools',
  '/premium',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /ai/* → Startseite (Feature nicht aktiv)
  if (pathname === '/ai' || pathname.startsWith('/ai/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // POST-Requests auf Seiten-Routen (nicht /api) → 405 zurückgeben
  // Verhindert Bot-Scanner-Requests die Next.js digest-Fehler verursachen
  if (request.method === 'POST' && !pathname.startsWith('/api')) {
    return new NextResponse(null, { status: 405 });
  }

  // Auth-Schutz: Nicht-öffentliche Routen ohne Token → Login
  if (!isPublicPath(pathname)) {
    const token = request.cookies.get('sf1_access_token');
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*\\.js|swe-worker-.*\\.js|icon-.*\\.png|apple-touch-icon\\.png).*)'],
};
