'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Toggle from '@/components/admin/forms/Toggle';

export default function FAQForm({ settings, setSettings, items, setItems, onReload }) {
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(items?.[0]?.id || null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const list = useMemo(() => items || [], [items]);

  const updateLocal = (id, patch) => {
    setItems((prev) => (prev || []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const move = (id, dir) => {
    setItems((prev) => {
      const arr = [...(prev || [])];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) return prev;

      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;

      const a = arr[idx];
      const b = arr[to];

      const tmp = a.sort_order;
      a.sort_order = b.sort_order;
      b.sort_order = tmp;

      arr[idx] = b;
      arr[to] = a;

      return arr;
    });
  };

  const saveSettings = async () => {
    setMsg({ type: '', text: '' });
    setBusyId('settings');

    const patch = {
      title: settings?.title || 'FAQ',
      subtitle: settings?.subtitle || null,
      is_enabled: !!settings?.is_enabled,
    };

    const { data, error } = await supabase
      .from('faq_page_settings')
      .update(patch)
      .eq('id', true)
      .select('*')
      .single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setSettings(data);
    setMsg({ type: 'success', text: 'Page settings saved.' });
  };

  const createItem = async () => {
    setMsg({ type: '', text: '' });
    setBusyId('new');

    const payload = {
      question: 'New question?',
      answer: 'Write the answer...',
      is_enabled: true,
      sort_order: (list?.[list.length - 1]?.sort_order || 0) + 10,
    };

    const { data, error } = await supabase.from('faq_items').insert(payload).select('*').single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => [...(prev || []), data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    setExpandedId(data.id);
    setMsg({ type: 'success', text: 'Created.' });
  };

  const saveItem = async (r) => {
    setMsg({ type: '', text: '' });
    setBusyId(r.id);

    const clean = {
      question: r.question || '',
      answer: r.answer || '',
      is_enabled: !!r.is_enabled,
      sort_order: Number.isFinite(r.sort_order) ? r.sort_order : 0,
    };

    const { data, error } = await supabase.from('faq_items').update(clean).eq('id', r.id).select('*').single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => (prev || []).map((x) => (x.id === r.id ? data : x)));
    setMsg({ type: 'success', text: 'Saved.' });
  };

  const deleteItem = async (r) => {
    if (!confirm(`Delete this FAQ item?\n\n"${r.question}"`)) return;

    setMsg({ type: '', text: '' });
    setBusyId(r.id);

    const { error } = await supabase.from('faq_items').delete().eq('id', r.id);

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => (prev || []).filter((x) => x.id !== r.id));
    setMsg({ type: 'success', text: 'Deleted.' });
    if (expandedId === r.id) setExpandedId(null);
  };

  return (
    <div className="d-flex flex-column gap-3">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <AdminCard title="Page Settings">
        <div className="row g-2">
          <div className="col-md-6">
            <TextInput
              label="Title"
              value={settings?.title || ''}
              onChange={(v) => setSettings((p) => ({ ...(p || {}), title: v }))}
            />
          </div>
          <div className="col-md-6">
            <TextInput
              label="Subtitle"
              value={settings?.subtitle || ''}
              onChange={(v) => setSettings((p) => ({ ...(p || {}), subtitle: v }))}
            />
          </div>
        </div>

        <Toggle
          label="Enabled"
          checked={!!settings?.is_enabled}
          onChange={(v) => setSettings((p) => ({ ...(p || {}), is_enabled: v }))}
          hint="Disable to hide FAQ page publicly."
        />

        <button className="btn btn-primary" onClick={saveSettings} disabled={busyId === 'settings'}>
          {busyId === 'settings' ? 'Saving...' : 'Save Page Settings'}
        </button>
      </AdminCard>

      <AdminCard title="FAQ Items">
        <div className="d-flex gap-2 flex-wrap mb-2">
          <button className="btn btn-outline-light" onClick={createItem} disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Creating...' : '+ Add FAQ'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onReload}>
            Reload
          </button>
        </div>

        {list.length === 0 ? <div className="text-center opacity-75 py-4">No FAQ items yet.</div> : null}

        <div className="d-flex flex-column gap-2">
          {list.map((r, index) => {
            const open = expandedId === r.id;

            return (
              <div key={r.id} className="card bg-black border border-secondary">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="fw-semibold">
                      {r.question || 'Untitled'}
                      {!r.is_enabled ? <span className="badge text-bg-secondary ms-2">Disabled</span> : null}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => setExpandedId(open ? null : r.id)}
                      >
                        {open ? 'Collapse' : 'Edit'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => move(r.id, -1)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <i className="fa-solid fa-arrow-up" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => move(r.id, 1)}
                        disabled={index === list.length - 1}
                        title="Move down"
                      >
                        <i className="fa-solid fa-arrow-down" />
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-3">
                      <TextInput
                        label="Question"
                        value={r.question || ''}
                        onChange={(v) => updateLocal(r.id, { question: v })}
                      />

                      <TextArea
                        label="Answer"
                        value={r.answer || ''}
                        onChange={(v) => updateLocal(r.id, { answer: v })}
                        rows={6}
                      />

                      <Toggle
                        label="Enabled"
                        checked={!!r.is_enabled}
                        onChange={(v) => updateLocal(r.id, { is_enabled: v })}
                        hint="Disabled FAQ items are hidden from public."
                      />

                      <div className="row g-2">
                        <div className="col-md-4">
                          <TextInput
                            label="Sort Order"
                            value={String(r.sort_order ?? 0)}
                            onChange={(v) => updateLocal(r.id, { sort_order: parseInt(v || '0', 10) })}
                          />
                        </div>
                      </div>

                      <div className="d-flex gap-2 flex-wrap mt-2">
                        <button className="btn btn-primary" onClick={() => saveItem(r)} disabled={busyId === r.id}>
                          {busyId === r.id ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => deleteItem(r)} disabled={busyId === r.id}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}
