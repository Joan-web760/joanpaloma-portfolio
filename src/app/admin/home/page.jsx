'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';

import HeroForm from '@/components/admin/home/HeroForm';
import VideoForm from '@/components/admin/home/VideoForm';
import AboutForm from '@/components/admin/home/AboutForm';
import ListsForm from '@/components/admin/home/ListsForm';
import SnapshotForm from '@/components/admin/home/SnapshotForm';
import FinalCTAForm from '@/components/admin/home/FinalCTAForm';

export default function AdminHomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase
      .from('home_page_settings')
      .select('*')
      .eq('id', true)
      .single();

    if (error) setMsg({ type: 'danger', text: error.message });
    setData(data || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (patch) => {
    if (!data) return;

    setSaving(true);
    setMsg({ type: '', text: '' });

    const next = { ...data, ...patch };

    const { data: updated, error } = await supabase
      .from('home_page_settings')
      .update(next)
      .eq('id', true)
      .select('*')
      .single();

    if (error) {
      setSaving(false);
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setData(updated);
    setSaving(false);
    setMsg({ type: 'success', text: 'Saved.' });
  };

  if (loading) return <div className="py-5 text-center opacity-75">Loading...</div>;
  if (!data) return <div className="py-5 text-center opacity-75">No settings found.</div>;

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Home Page" subtitle="Edit sections of the public home page." />

      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <HeroForm data={data} onSave={save} saving={saving} />
      <VideoForm data={data} onSave={save} saving={saving} />
      <AboutForm data={data} onSave={save} saving={saving} />
      <ListsForm data={data} onSave={save} saving={saving} />
      <SnapshotForm data={data} onSave={save} saving={saving} />
      <FinalCTAForm data={data} onSave={save} saving={saving} />
    </div>
  );
}
