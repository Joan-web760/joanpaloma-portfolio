'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SettingsForm from '@/components/admin/settings/SettingsForm';
import BackgroundSettingsForm from '@/components/admin/settings/BackgroundSettingsForm';

export default function AdminSettingsPage() {
  const [site, setSite] = useState(null);
  const [bg, setBg] = useState(null);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [sRes, bRes] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', true).single(),
      supabase.from('background_settings').select('*').eq('id', true).single(),
    ]);

    if (sRes.error) setMsg({ type: 'danger', text: sRes.error.message });
    if (bRes.error) setMsg({ type: 'danger', text: bRes.error.message });

    setSite(sRes.data || null);
    setBg(bRes.data || null);
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

      <div className="row g-3">
        <div className="col-lg-6">
          <SettingsForm site={site} setSite={setSite} onReload={load} />
        </div>

        <div className="col-lg-6">
          <BackgroundSettingsForm bg={bg} setBg={setBg} onReload={load} />
        </div>
      </div>
    </div>
  );
}
