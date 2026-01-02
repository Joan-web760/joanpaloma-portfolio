'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PricingForm from '@/components/admin/pricing/PricingForm';

export default function AdminPricingPage() {
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [sRes, pRes] = await Promise.all([
      supabase.from('pricing_page_settings').select('*').eq('id', true).single(),
      supabase.from('pricing_plans').select('*').order('sort_order', { ascending: true }),
    ]);

    if (sRes.error) setMsg({ type: 'danger', text: sRes.error.message });
    if (pRes.error) setMsg({ type: 'danger', text: pRes.error.message });

    setSettings(sRes.data || null);
    setPlans(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Pricing" subtitle="Manage pricing page settings and plans." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}
      {loading ? (
        <div className="py-5 text-center opacity-75">Loading...</div>
      ) : (
        <PricingForm settings={settings} setSettings={setSettings} plans={plans} setPlans={setPlans} onReload={load} />
      )}
    </div>
  );
}
