'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, isAdminUser, signOut } from '@/lib/auth';

const PUBLIC_ADMIN_ROUTES = ['/admin/login'];

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      // Public admin routes should be accessible without session
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

      const ok = await isAdminUser(session.user.id);
      if (!alive) return;

      if (!ok) {
        await signOut();
        if (!alive) return;

        setReady(true);
        setAllowed(false);

        router.replace(
          `/admin/login?error=not_allowed&next=${encodeURIComponent(pathname || '/admin')}`
        );
        return;
      }

      setReady(true);
      setAllowed(true);
    };

    run();

    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (!ready) {
    return <div className="py-5 text-center opacity-75">Checking admin access...</div>;
  }

  if (!allowed) return null;

  return <>{children}</>;
}
