'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const isExternal = (href = '') => /^https?:\/\//i.test(href);

export default function PublicNavbar() {
  const pathname = usePathname();
  const [nav, setNav] = useState(null);
  const [links, setLinks] = useState([]);
  const [errText, setErrText] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      setErrText('');

      const [settingsRes, linksRes] = await Promise.all([
        supabase.from('site_navbar_settings').select('*').eq('id', true).maybeSingle(),
        supabase
          .from('site_navbar_links')
          .select('id,label,href,is_enabled,sort_order')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      if (settingsRes.error) setErrText(settingsRes.error.message);
      if (linksRes.error) setErrText(linksRes.error.message);

      setNav(
        settingsRes.data || {
          brand_label: 'Your Name',
          brand_href: '/',
          cta_enabled: true,
          cta_label: 'Book a Call',
          cta_href: '/contact',
        }
      );

      setLinks(Array.isArray(linksRes.data) ? linksRes.data : []);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredLinks = useMemo(() => {
    return (links || [])
      .map((l) => ({
        ...l,
        label: (l.label || '').trim(),
        href: (l.href || '').trim(),
      }))
      .filter((l) => l.label && l.href);
  }, [links]);

  if (!nav) return null;

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark bg-black border-bottom border-secondary sticky-top"
      style={{ zIndex: 50 }}
    >
      <div className="container">
        {/* Brand */}
        <Link className="navbar-brand fw-bold" href={nav.brand_href || '/'}>
          {nav.brand_label || 'Your Name'}
        </Link>

        {/* Toggler */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
          aria-controls="nav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Nav */}
        <div id="nav" className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {filteredLinks.map((l) => {
              const active = !isExternal(l.href) && (pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href)));

              if (isExternal(l.href)) {
                return (
                  <li className="nav-item" key={l.id}>
                    <a className="nav-link" href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                );
              }

              return (
                <li className="nav-item" key={l.id}>
                  <Link className={`nav-link ${active ? 'active fw-semibold' : ''}`} href={l.href}>
                    {l.label}
                  </Link>
                </li>
              );
            })}

            {!filteredLinks.length ? (
              <li className="nav-item">
                <span className="nav-link opacity-50">(No navbar links)</span>
              </li>
            ) : null}
          </ul>

          {/* CTA */}
          {nav.cta_enabled ? (
            <Link href={nav.cta_href || '/contact'} className="btn btn-outline-light">
              {nav.cta_label || 'Book a Call'}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Optional: surface errors only in dev */}
      {errText && process.env.NODE_ENV !== 'production' ? (
        <div className="container py-2">
          <div className="small text-danger">{errText}</div>
        </div>
      ) : null}
    </nav>
  );
}
