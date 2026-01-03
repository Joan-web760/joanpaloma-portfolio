import Script from 'next/script';

import AuthGuard from '@/components/admin/AuthGuard';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin',
};

export default function AdminLayout({ children }) {
  return (
    <>
      {/* Bootstrap CSS (ADMIN) */}
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
      />

      {/* FontAwesome (ADMIN) */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />

      {/* Chart.js (ADMIN) */}
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"
        strategy="afterInteractive"
      />

      {/* Bootstrap JS bundle (ADMIN) - required for dropdown */}
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />

      <AuthGuard>
        <AdminShell>{children}</AdminShell>
      </AuthGuard>
    </>
  );
}
