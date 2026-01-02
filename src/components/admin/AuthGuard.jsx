'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getSession, isAdminUser, signOut } from '@/lib/auth';

const PUBLIC_ADMIN_ROUTES = ['/admin/login', '/admin/register'];

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      // Allow public admin routes (avoid redirect loop)
      if (PUBLIC_ADMIN_ROUTES.includes(pathname)) {
        if (!alive) return;
        setReady(true);
        setAllowed(true);
        return;
      }

      const { session } = await getSession();

      // Not logged in -> login (preserve next)
      if (!session?.user) {
        if (!alive) return;
        setReady(true);
        setAllowed(false);
        router.replace(`/admin/login?next=${encodeURIComponent(pathname || '/admin')}`);
        return;
      }

      const ok = await isAdminUser();
      if (!alive) return;

      if (!ok) {
        // Logged in but not allowlisted -> sign out then go to login with error
        await signOut();
        if (!alive) return;

        setReady(true);
        setAllowed(false);

        const nextUrl = pathname || '/admin';
        router.replace(`/admin/login?error=not_allowed&next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      // Optional: if user is already logged in and navigates to /admin/login manually,
      // send them to next or dashboard (handled above by PUBLIC_ADMIN_ROUTES bypass).
      // Leaving this comment for clarity.

      setReady(true);
      setAllowed(true);
    };

    run();

    return () => {
      alive = false;
    };
  }, [router, pathname, searchParams]);

  if (!ready) {
    return <div className="py-5 text-center opacity-75">Checking admin access...</div>;
  }

  if (!allowed) return null;

  return <>{children}</>;
}
