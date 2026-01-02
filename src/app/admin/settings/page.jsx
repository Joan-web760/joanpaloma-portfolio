'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SettingsForm from '@/components/admin/settings/SettingsForm';
import BackgroundSettingsForm from '@/components/admin/settings/BackgroundSettingsForm';

export default function AdminSettingsPage() {
  // Combine navbar + footer into a single object for SettingsForm
  const [site, setSite] = useState(null);

  // Background table maps 1:1
  const [bg, setBg] = useState(null);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [navRes, footerRes, bgRes] = await Promise.all([
      supabase.from('site_navbar_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('site_footer_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('site_background_settings').select('*').eq('id', true).maybeSingle(),
    ]);

    const err = navRes.error || footerRes.error || bgRes.error;
    if (err) setMsg({ type: 'danger', text: err.message });

    const mergedSite = {
      // keep single-row pattern consistent for your forms
      id: true,

      // navbar settings
      ...(navRes.data || {}),

      // footer settings (names won't collide with navbar based on your schema)
      ...(footerRes.data || {}),
    };

    // If both are missing, keep it null so your form can show "missing row"
    const hasAnySiteData = !!(navRes.data || footerRes.data);
    setSite(hasAnySiteData ? mergedSite : null);

    setBg(bgRes.data || null);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="py-5 text-center opacity-75">Loading...</div>;

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Settings" subtitle="Global site settings and background configuration." />

      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      {/* Helpful hints if rows are missing */}
      <div className="row g-3">
        <div className="col-lg-6">
          {!site ? (
            <div className="alert alert-warning">
              Missing site settings row(s). Expected single rows in:
              <div className="mt-2">
                <code>site_navbar_settings</code> (id=true) and <code>site_footer_settings</code> (id=true)
              </div>
              <div className="small opacity-75 mt-2">
                You can still save from the form if it uses <code>upsert</code>.
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
