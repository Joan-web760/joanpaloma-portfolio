'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PortfolioForm from '@/components/admin/portfolio/PortfolioForm';

export default function AdminPortfolioPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) setMsg({ type: 'danger', text: error.message });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Portfolio" subtitle="Manage portfolio items and galleries." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}
      {loading ? (
        <div className="py-5 text-center opacity-75">Loading...</div>
      ) : (
        <PortfolioForm items={items} setItems={setItems} onReload={load} />
      )}
    </div>
  );
}
