'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import PricingSection from '@/components/pricing/PricingSection';
import PricingPlans from '@/components/pricing/PricingPlans';
import PricingCTAButton from '@/components/pricing/PricingCTAButton';

export default function PricingPage() {
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, plansRes] = await Promise.all([
        supabase.from('pricing_page_settings').select('*').eq('id', true).single(),
        supabase
          .from('pricing_plans')
          .select('*')
          .eq('is_enabled', true)
          .order('is_popular', { ascending: false })
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setSettings(settingsRes.data || null);
      setPlans(plansRes.data || []);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading pricing...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <PricingSection className="pt-4">
      <div className="text-center mb-4">
        <h1 className="display-6 fw-bold">{settings.title}</h1>
        {settings.subtitle ? <p className="lead opacity-75 mb-0">{settings.subtitle}</p> : null}
      </div>

      <PricingPlans plans={plans} />

      <div className="text-center mt-4">
        <PricingCTAButton href={settings.global_cta_href} label={settings.global_cta_label} />
        {settings.footer_note ? <div className="small opacity-75 mt-3">{settings.footer_note}</div> : null}
      </div>
    </PricingSection>
  );
}
