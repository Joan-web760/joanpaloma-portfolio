'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import TestimonialsForm from '@/components/admin/testimonials/TestimonialsForm';

export default function AdminTestimonialsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) setMsg({ type: 'danger', text: error.message });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Testimonials" subtitle="Manage testimonials displayed on the public site." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}
      {loading ? (
        <div className="py-5 text-center opacity-75">Loading...</div>
      ) : (
        <TestimonialsForm rows={rows} setRows={setRows} onReload={load} />
      )}
    </div>
  );
}
