'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/lib/routes';

export default function PublicNavbar() {
  const [site, setSite] = useState(null);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('*')
      .eq('id', true)
      .single()
      .then(({ data }) => setSite(data));
  }, []);

  if (!site) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-black border-bottom border-secondary">
      <div className="container">
        <Link className="navbar-brand fw-bold" href={ROUTES.home}>
          {site.nav_brand_label}
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div id="nav" className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {Object.entries(ROUTES)
              .filter(([k]) => !['admin'].includes(k))
              .map(([key, href]) => (
                <li className="nav-item" key={key}>
                  <Link className="nav-link" href={href}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Link>
                </li>
              ))}
          </ul>

          <Link href={site.nav_cta_href} className="btn btn-outline-light">
            {site.nav_cta_label}
          </Link>
        </div>
      </div>
    </nav>
  );
}
