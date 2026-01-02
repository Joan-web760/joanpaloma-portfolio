'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import ToolsGroup from '@/components/tools/ToolsGroup';
import ToolsSection from '@/components/tools/ToolsSection';

export default function ToolsPage() {
  const [settings, setSettings] = useState(null);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, groupsRes, itemsRes] = await Promise.all([
        supabase.from('tools_page_settings').select('*').eq('id', true).single(),
        supabase
          .from('tools_groups')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('tools_items')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setSettings(settingsRes.data || null);
      setGroups(groupsRes.data || []);
      setItems(itemsRes.data || []);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const itemsByGroup = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.group_id)) map.set(it.group_id, []);
      map.get(it.group_id).push(it);
    }
    return map;
  }, [items]);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading tools...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <ToolsSection className="pt-4">
      <div className="text-center mb-4">
        <h1 className="display-6 fw-bold">{settings.title}</h1>
        {settings.subtitle ? <p className="lead opacity-75 mb-0">{settings.subtitle}</p> : null}
      </div>

      <div className="row g-3">
        {groups.map((g) => (
          <div className="col-lg-6" key={g.id}>
            <ToolsGroup group={g} items={itemsByGroup.get(g.id) || []} />
          </div>
        ))}
      </div>
    </ToolsSection>
  );
}
