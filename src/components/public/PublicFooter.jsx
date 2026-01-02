'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PublicFooter() {
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
    <footer className="border-top border-secondary py-4 mt-5">
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="opacity-75">{site.footer_text}</div>

        <div className="d-flex gap-3">
          {(site.social_links || []).map((s, i) => (
            <a
              key={i}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-light fs-5"
              aria-label={s.label}
            >
              <i className={s.icon} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
