'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import PortfolioGrid from '@/components/portfolio/PortfolioGrid';
import PortfolioSection from '@/components/portfolio/PortfolioSection';

export default function PortfolioPage() {
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, itemsRes, imagesRes] = await Promise.all([
        supabase.from('portfolio_page_settings').select('*').eq('id', true).single(),
        supabase
          .from('portfolio_items')
          .select('*')
          .eq('is_enabled', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true }),
        supabase
          .from('portfolio_item_images')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setSettings(settingsRes.data || null);
      setItems(itemsRes.data || []);
      setImages(imagesRes.data || []);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const imagesByItem = useMemo(() => {
    const map = new Map();
    for (const img of images) {
      const key = img.portfolio_item_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(img);
    }
    return map;
  }, [images]);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading portfolio...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <PortfolioSection className="pt-4">
      <div className="text-center mb-4">
        <h1 className="display-6 fw-bold">{settings.title}</h1>
        {settings.subtitle ? <p className="lead opacity-75 mb-0">{settings.subtitle}</p> : null}
      </div>

      <PortfolioGrid items={items} imagesByItem={imagesByItem} />
    </PortfolioSection>
  );
}
