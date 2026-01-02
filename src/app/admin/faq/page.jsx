'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FAQForm from '@/components/admin/faq/FAQForm';

export default function AdminFAQPage() {
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [sRes, iRes] = await Promise.all([
      supabase.from('faq_page_settings').select('*').eq('id', true).single(),
      supabase.from('faq_items').select('*').order('sort_order', { ascending: true }),
    ]);

    if (sRes.error) setMsg({ type: 'danger', text: sRes.error.message });
    if (iRes.error) setMsg({ type: 'danger', text: iRes.error.message });

    setSettings(sRes.data || null);
    setItems(iRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="py-5 text-center opacity-75">Loading...</div>;

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="FAQ" subtitle="Manage questions and answers displayed on the public FAQ page." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}
      <FAQForm
        settings={settings}
        setSettings={setSettings}
        items={items}
        setItems={setItems}
        onReload={load}
      />
    </div>
  );
}
