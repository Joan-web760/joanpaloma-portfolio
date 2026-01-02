'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ToolsForm from '@/components/admin/tools/ToolsForm';

export default function AdminToolsPage() {
  const [settings, setSettings] = useState(null);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [sRes, gRes, iRes] = await Promise.all([
      supabase.from('tools_page_settings').select('*').eq('id', true).single(),
      supabase.from('tools_groups').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('tools_items')
        .select('*')
        .order('sort_order', { ascending: true }),
    ]);

    if (sRes.error) setMsg({ type: 'danger', text: sRes.error.message });
    if (gRes.error) setMsg({ type: 'danger', text: gRes.error.message });
    if (iRes.error) setMsg({ type: 'danger', text: iRes.error.message });

    setSettings(sRes.data || null);
    setGroups(gRes.data || []);
    setItems(iRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveAll = async ({ settingsPatch, groupsPatch, itemsPatch }) => {
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      if (settingsPatch) {
        const { data, error } = await supabase
          .from('tools_page_settings')
          .update(settingsPatch)
          .eq('id', true)
          .select('*')
          .single();

        if (error) throw error;
        setSettings(data);
      }

      // Groups upserts
      if (Array.isArray(groupsPatch)) {
        const { data, error } = await supabase
          .from('tools_groups')
          .upsert(groupsPatch, { onConflict: 'id' })
          .select('*');

        if (error) throw error;
        setGroups(data || []);
      }

      // Items upserts
      if (Array.isArray(itemsPatch)) {
        const { data, error } = await supabase
          .from('tools_items')
          .upsert(itemsPatch, { onConflict: 'id' })
          .select('*');

        if (error) throw error;
        setItems(data || []);
      }

      setMsg({ type: 'success', text: 'Saved.' });
    } catch (e) {
      setMsg({ type: 'danger', text: e?.message || 'Save failed.' });
    }

    setSaving(false);
  };

  if (loading) return <div className="py-5 text-center opacity-75">Loading...</div>;

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Tools & Skills" subtitle="Manage groups and skills shown on the public Tools page." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}
      <ToolsForm
        settings={settings}
        groups={groups}
        items={items}
        onSave={saveAll}
        saving={saving}
        onReload={load}
      />
    </div>
  );
}
