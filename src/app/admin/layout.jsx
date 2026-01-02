import Script from 'next/script';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminNavbar from '@/components/admin/AdminNavbar';
// import AdminSidebar from '@/components/admin/AdminSidebar'; // optional

export const metadata = {
  title: 'Admin',
};

export default function AdminLayout({ children }) {
  return (
    <>
      {/* ADMIN CDNs */}
      {/* Bootstrap CSS (ADMIN) - ok to duplicate; browser will usually reuse cache */}
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

      {/* Bootstrap JS bundle (ADMIN) */}
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />

      <AuthGuard>
        <div className="bg-black text-light min-vh-100">
          <AdminNavbar />

          <main className="container py-4">
            {/* optional layout with sidebar */}
            {/*
            <div className="row g-4">
              <div className="col-lg-3"><AdminSidebar /></div>
              <div className="col-lg-9">{children}</div>
            </div>
            */}
            {children}
          </main>
        </div>
      </AuthGuard>
    </>
  );
}
