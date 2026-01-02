'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import TestimonialsSection from '@/components/testimonials/TestimonialsSection';
import TestimonialList from '@/components/testimonials/TestimonialList';

export default function TestimonialsPage() {
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, itemsRes] = await Promise.all([
        supabase.from('testimonials_page_settings').select('*').eq('id', true).single(),
        supabase
          .from('testimonials')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setSettings(settingsRes.data || null);
      setItems(itemsRes.data || []);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading testimonials...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <TestimonialsSection className="pt-4">
      <div className="text-center mb-4">
        <h1 className="display-6 fw-bold">{settings.title}</h1>
        {settings.subtitle ? <p className="lead opacity-75 mb-0">{settings.subtitle}</p> : null}
      </div>

      <TestimonialList items={items} />
    </TestimonialsSection>
  );
}
