import Script from 'next/script';

import AuthGuard from '@/components/admin/AuthGuard';
import AdminShell from '@/components/admin/AdminShell';
import BackgroundWrapper from '@/components/background/BackgroundWrapper';

export const metadata = {
  title: 'Admin',
};

export default function AdminLayout({ children }) {
  return (
    <BackgroundWrapper>
      <AuthGuard>
        <AdminShell>
          {children}

          {/* Chart.js (ADMIN only) */}
          <Script
            src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
            strategy="afterInteractive"
          />
        </AdminShell>
      </AuthGuard>
    </BackgroundWrapper>
  );
}
