'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';

export default function AdminLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    const run = async () => {
      await signOut();
      if (!alive) return;
      router.replace('/admin/login');
    };

    run();

    return () => {
      alive = false;
    };
  }, [router]);

  return <div className="py-5 text-center opacity-75">Signing out...</div>;
}
