'use client';

import { usePathname } from 'next/navigation';
import AdminNavbar from '@/components/admin/AdminNavbar';
// import AdminSidebar from '@/components/admin/AdminSidebar'; // optional

const HIDE_NAV_ROUTES = ['/admin/login', '/admin/register'];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const hideNav = HIDE_NAV_ROUTES.includes(pathname);

  return (
    <div className="bg-black bg-opacity-75 text-light min-vh-100 d-flex flex-column">
      {!hideNav && <AdminNavbar />}

      <main className="container py-4 flex-grow-1">
        {/* Optional layout with sidebar */}
        {/*
        <div className="row g-4">
          <div className="col-lg-3"><AdminSidebar /></div>
          <div className="col-lg-9">{children}</div>
        </div>
        */}
        {children}
      </main>
    </div>
  );
}
