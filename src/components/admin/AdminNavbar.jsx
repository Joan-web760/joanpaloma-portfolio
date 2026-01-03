'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { adminRoutes, isActiveRoute } from '@/lib/routes';

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const links = adminRoutes?.primary || [];

  const closeDropdowns = () => {
    const bs = typeof window !== 'undefined' ? window.bootstrap : null;
    if (!bs) return;

    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach((toggle) => {
      const inst = bs.Dropdown.getInstance(toggle);
      if (inst) inst.hide();
    });
  };

  const logout = async () => {
    await signOut();
    closeDropdowns();
    router.replace('/admin/login');
  };

  return (
    <nav className="navbar navbar-dark bg-dark border-bottom border-secondary sticky-top">
      <div className="container-fluid py-1">
        {/* Left: Brand */}
        <Link href="/admin" className="navbar-brand d-flex align-items-center gap-2 fw-semibold">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-3 border border-secondary"
            style={{ width: 32, height: 32 }}
          >
            <i className="fa-solid fa-shield-halved" />
          </span>
          <span>Admin</span>
        </Link>

        {/* Desktop (lg+): inline nav */}
        <div className="d-none d-lg-flex align-items-center flex-grow-1 ms-2">
          <ul className="navbar-nav flex-row flex-wrap gap-1 me-auto mb-0">
            {links.map((r) => {
              const active = isActiveRoute(pathname, r.href);
              return (
                <li className="nav-item" key={r.href}>
                  <Link
                    href={r.href}
                    className={`nav-link px-3 py-2 rounded-3 ${
                      active ? 'bg-light text-dark fw-semibold' : 'text-light'
                    }`}
                    style={{ lineHeight: 1.1 }}
                  >
                    {r.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right: user dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-2 px-3"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle border border-secondary"
                style={{ width: 26, height: 26 }}
              >
                <i className="fa-solid fa-user" />
              </span>
              <span className="d-none d-xl-inline">Account</span>
              <i className="fa-solid fa-chevron-down ms-1" style={{ fontSize: 12 }} />
            </button>

            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <span className="dropdown-item-text small text-muted">
                  Signed in
                </span>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button className="dropdown-item text-danger" onClick={logout} type="button">
                  <i className="fa-solid fa-right-from-bracket me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile/Tablet (<lg): hamburger dropdown */}
        <div className="d-flex d-lg-none align-items-center gap-2">
          <div className="dropdown">
            <button
              className="btn btn-outline-light btn-sm px-3"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Open admin menu"
            >
              <i className="fa-solid fa-bars" />
            </button>

            <ul className="dropdown-menu dropdown-menu-end">
              <li className="px-3 pt-2 pb-1">
                <div className="small text-muted">Navigation</div>
              </li>

              {links.map((r) => {
                const active = isActiveRoute(pathname, r.href);
                return (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      onClick={closeDropdowns}
                      className={`dropdown-item d-flex align-items-center justify-content-between ${
                        active ? 'active fw-semibold' : ''
                      }`}
                    >
                      <span>{r.label}</span>
                      {active ? <i className="fa-solid fa-check" /> : null}
                    </Link>
                  </li>
                );
              })}

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button className="dropdown-item text-danger" onClick={logout} type="button">
                  <i className="fa-solid fa-right-from-bracket me-2" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
