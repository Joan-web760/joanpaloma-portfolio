'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SettingsForm from '@/components/admin/settings/SettingsForm';
import BackgroundSettingsForm from '@/components/admin/settings/BackgroundSettingsForm';

export default function AdminSettingsPage() {
  // Combine navbar + footer + socials into a single object for SettingsForm
  const [site, setSite] = useState(null);

  // Background table maps 1:1
  const [bg, setBg] = useState(null);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [navRes, footerRes, socialsRes, bgRes] = await Promise.all([
      supabase.from('site_navbar_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('site_footer_settings').select('*').eq('id', true).maybeSingle(),
      supabase
        .from('site_footer_social_links')
        .select('*')
        .order('sort_order', { ascending: true })
        .limit(10),
      supabase.from('site_background_settings').select('*').eq('id', true).maybeSingle(),
    ]);

    const err = navRes.error || footerRes.error || socialsRes.error || bgRes.error;
    if (err) setMsg({ type: 'danger', text: err.message });

    const mergedSite = {
      id: true,
      ...(navRes.data || {}),
      ...(footerRes.data || {}),
      social_links: socialsRes.data || [],
    };

    // If navbar + footer are both missing, keep null so SettingsForm can show the warning.
    // (Social links alone shouldn't count as "site settings exist".)
    const hasAnySiteData = !!(navRes.data || footerRes.data);
    setSite(hasAnySiteData ? mergedSite : null);

    setBg(bgRes.data || null);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="py-5 text-center opacity-75">Loading...</div>;

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Settings" subtitle="Global site settings and background configuration." />

      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <div className="row g-3">
        <div className="col-lg-6">
          {!site ? (
            <div className="alert alert-warning">
              Missing site settings row(s). Expected single rows in:
              <div className="mt-2">
                <code>site_navbar_settings</code> (id=true) and <code>site_footer_settings</code> (id=true)
              </div>
              <div className="small opacity-75 mt-2">
                You can still save from the form because it uses <code>upsert</code>.
              </div>
            </div>
          ) : null}

          <SettingsForm site={site} setSite={setSite} onReload={load} />
        </div>

        <div className="col-lg-6">
          {!bg ? (
            <div className="alert alert-warning">
              Missing background settings row. Expected single row in:
              <div className="mt-2">
                <code>site_background_settings</code> (id=true)
              </div>
              <div className="small opacity-75 mt-2">
                You can still save from the form if it uses <code>upsert</code>.
              </div>
            </div>
          ) : null}

          <BackgroundSettingsForm bg={bg} setBg={setBg} onReload={load} />
        </div>
      </div>
    </div>
  );
}
