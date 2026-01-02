'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import ServicesOverview from '@/components/services/ServicesOverview';
import PrimaryService from '@/components/services/PrimaryService';
import AdditionalServices from '@/components/services/AdditionalServices';

export default function ServicesPage() {
  const [data, setData] = useState({
    settings: null,
    primary: null,
    additional: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, primaryRes, additionalRes] = await Promise.all([
        supabase.from('services_page_settings').select('*').eq('id', true).single(),
        supabase.from('services_primary').select('*').eq('id', true).single(),
        supabase
          .from('services_additional')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setData({
        settings: settingsRes.data || null,
        primary: primaryRes.data || null,
        additional: additionalRes.data || [],
      });

      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-5 text-center opacity-75">
        Loading services...
      </div>
    );
  }

  if (!data.settings?.is_enabled) return null;

  return (
    <>
      <ServicesOverview settings={data.settings} />
      <PrimaryService data={data.primary} />
      <AdditionalServices items={data.additional} />
    </>
  );
}
