'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { adminRoutes, isActiveRoute } from '@/lib/routes';

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  const links = adminRoutes?.primary || [];

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark border-bottom border-secondary sticky-top">
      <div className="container-fluid">
        <Link className="navbar-brand fw-semibold" href="/admin">
          Admin
        </Link>

        {/* Links always visible (no collapse dependency) */}
        <ul className="navbar-nav me-auto mb-0 flex-row flex-wrap gap-2">
          {links.map((r) => {
            const active = isActiveRoute(pathname, r.href);
            return (
              <li className="nav-item" key={r.href}>
                <Link className={`nav-link ${active ? 'active fw-semibold' : ''}`} href={r.href}>
                  {r.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-light btn-sm" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket me-2" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
