'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PublicFooter() {
  const [footer, setFooter] = useState(null);
  const [socials, setSocials] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [footerRes, socialsRes] = await Promise.all([
        supabase.from('site_footer_settings').select('*').eq('id', true).maybeSingle(),
        supabase
          .from('site_footer_social_links')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      if (footerRes.error) {
        // eslint-disable-next-line no-console
        console.warn('Footer settings load error:', footerRes.error.message);
      }
      if (socialsRes.error) {
        // eslint-disable-next-line no-console
        console.warn('Footer socials load error:', socialsRes.error.message);
      }

      setFooter(
        footerRes.data || {
          id: true,
          footer_text: '© Your Name. All rights reserved.',
          show_social_links: true,
        }
      );

      setSocials(Array.isArray(socialsRes.data) ? socialsRes.data : []);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!footer) return null;

  const showSocials = !!footer.show_social_links && socials.length > 0;

  return (
    <footer className="border-top border-secondary py-4 mt-5">
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="opacity-75">{footer.footer_text || ''}</div>

        {showSocials ? (
          <div className="d-flex gap-3">
            {socials.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-light fs-5"
                aria-label={s.label}
              >
                <i className={s.icon_class} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
