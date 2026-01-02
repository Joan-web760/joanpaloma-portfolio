'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import Timeline from '@/components/experience/Timeline';
import ExperienceHeader from '@/components/experience/ExperienceHeader';

export default function ExperiencePage() {
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, itemsRes] = await Promise.all([
        supabase.from('experience_page_settings').select('*').eq('id', true).single(),
        supabase
          .from('experience_timeline_items')
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
    return <div className="py-5 text-center opacity-75">Loading experience...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <>
      <ExperienceHeader title={settings.title} subtitle={settings.subtitle} />
      <Timeline items={items} />
    </>
  );
}
