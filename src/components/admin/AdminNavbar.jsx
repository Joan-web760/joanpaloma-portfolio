'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { adminRoutes } from '@/lib/routes';

export default function AdminNavbar() {
  const router = useRouter();

  const logout = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary">
      <div className="container-fluid">
        <Link className="navbar-brand fw-semibold" href="/admin">
          Admin
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#adminNavbar"
          aria-controls="adminNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="adminNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {(adminRoutes?.primary || []).map((r) => (
              <li className="nav-item" key={r.href}>
                <Link className="nav-link" href={r.href}>
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-light btn-sm" onClick={logout}>
              <i className="fa-solid fa-right-from-bracket me-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
