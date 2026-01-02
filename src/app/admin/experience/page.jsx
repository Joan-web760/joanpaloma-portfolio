'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ExperienceForm from '@/components/admin/experience/ExperienceForm';

export default function AdminExperiencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase
      .from('experience_page_settings')
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
      .from('experience_page_settings')
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
      <AdminPageHeader title="Experience" subtitle="Edit the public Experience timeline." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}
      <ExperienceForm data={data} onSave={save} saving={saving} />
    </div>
  );
}
