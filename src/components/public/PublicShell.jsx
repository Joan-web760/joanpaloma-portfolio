'use client';

import { usePathname } from 'next/navigation';
import BackgroundWrapper from '@/components/background/BackgroundWrapper';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';

export default function PublicShell({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // Admin pages should NOT render public chrome
  if (isAdmin) return children;

  return (
    <BackgroundWrapper>
      <PublicNavbar />
      <main className="container py-4">{children}</main>
      <PublicFooter />
    </BackgroundWrapper>
  );
}
