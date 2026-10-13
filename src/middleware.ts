import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRole, hasFullAccess } from '@/lib/auth/roles';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // All routes except landing page and login require authentication
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect upload and admin APIs - admin only
  if (pathname.startsWith('/api/upload') || pathname.startsWith('/api/admin/')) {
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // PDF reports are a Full-access feature
  if (pathname.startsWith('/api/report') && !hasFullAccess(getRole(user))) {
    return NextResponse.json({ error: 'Full access required' }, { status: 403 });
  }
  if (pathname.startsWith('/dashboard/reports') && !hasFullAccess(getRole(user))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Log every dashboard/admin page visit
  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

    const { error } = await supabase.from('page_views').insert({
      user_id: user.id,
      email: user.email ?? '',
      path: pathname,
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent'),
    });
    if (error) console.error('page_views insert failed:', error.message);
  }

  // If logged in user visits /login, redirect to dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/:path*', '/login'],
};
