'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Toggle from '@/components/admin/forms/Toggle';

export default function TestimonialsForm({ rows, setRows, onReload }) {
  const [expandedId, setExpandedId] = useState(rows?.[0]?.id || null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const list = useMemo(() => rows || [], [rows]);

  const updateLocal = (id, patch) => {
    setRows((prev) => (prev || []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const move = (id, dir) => {
    setRows((prev) => {
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

  const createRow = async () => {
    setMsg({ type: '', text: '' });
    setBusyId('new');

    const payload = {
      name: 'New Client',
      role: '',
      company: '',
      quote: 'Write a testimonial...',
      is_enabled: true,
      is_featured: false,
      sort_order: (list?.[list.length - 1]?.sort_order || 0) + 10,
    };

    const { data, error } = await supabase.from('testimonials').insert(payload).select('*').single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setRows((prev) => [data, ...(prev || [])]);
    setExpandedId(data.id);
    setMsg({ type: 'success', text: 'Created.' });
  };

  const saveRow = async (r) => {
    setMsg({ type: '', text: '' });
    setBusyId(r.id);

    const clean = {
      is_enabled: !!r.is_enabled,
      is_featured: !!r.is_featured,
      name: r.name || '',
      role: r.role || null,
      company: r.company || null,
      quote: r.quote || '',
      avatar_url: r.avatar_url || null,
      sort_order: Number.isFinite(r.sort_order) ? r.sort_order : 0,
    };

    const { data, error } = await supabase.from('testimonials').update(clean).eq('id', r.id).select('*').single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setRows((prev) => (prev || []).map((x) => (x.id === r.id ? data : x)));
    setMsg({ type: 'success', text: 'Saved.' });
  };

  const deleteRow = async (r) => {
    if (!confirm(`Delete testimonial from "${r.name}"? This cannot be undone.`)) return;

    setMsg({ type: '', text: '' });
    setBusyId(r.id);

    const { error } = await supabase.from('testimonials').delete().eq('id', r.id);

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setRows((prev) => (prev || []).filter((x) => x.id !== r.id));
    setMsg({ type: 'success', text: 'Deleted.' });
    if (expandedId === r.id) setExpandedId(null);
  };

  return (
    <div className="d-flex flex-column gap-3">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <div className="d-flex gap-2 flex-wrap">
        <button className="btn btn-outline-light" onClick={createRow} disabled={busyId === 'new'}>
          {busyId === 'new' ? 'Creating...' : '+ Add Testimonial'}
        </button>
        <button className="btn btn-outline-secondary" onClick={onReload}>
          Reload
        </button>
      </div>

      {list.length === 0 ? <div className="text-center opacity-75 py-5">No testimonials yet.</div> : null}

      <div className="d-flex flex-column gap-2">
        {list.map((r, index) => {
          const open = expandedId === r.id;

          return (
            <AdminCard key={r.id} title={r.name || 'Untitled'}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="small opacity-75">
                  {r.is_featured ? <span className="badge text-bg-warning me-2">Featured</span> : null}
                  {!r.is_enabled ? <span className="badge text-bg-secondary me-2">Disabled</span> : null}
                  <span className="me-2">Sort:</span>
                  <code>{r.sort_order ?? 0}</code>
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
                  <div className="row g-2">
                    <div className="col-md-4">
                      <TextInput label="Name" value={r.name || ''} onChange={(v) => updateLocal(r.id, { name: v })} />
                    </div>
                    <div className="col-md-4">
                      <TextInput label="Role" value={r.role || ''} onChange={(v) => updateLocal(r.id, { role: v })} />
                    </div>
                    <div className="col-md-4">
                      <TextInput
                        label="Company"
                        value={r.company || ''}
                        onChange={(v) => updateLocal(r.id, { company: v })}
                      />
                    </div>
                  </div>

                  <TextArea
                    label="Quote"
                    value={r.quote || ''}
                    onChange={(v) => updateLocal(r.id, { quote: v })}
                    rows={5}
                    required
                  />

                  <Toggle
                    label="Enabled"
                    checked={!!r.is_enabled}
                    onChange={(v) => updateLocal(r.id, { is_enabled: v })}
                    hint="Disabled testimonials are hidden from public."
                  />

                  <Toggle
                    label="Featured"
                    checked={!!r.is_featured}
                    onChange={(v) => updateLocal(r.id, { is_featured: v })}
                    hint="Featured testimonials can be shown in previews/homepage."
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
                    <button className="btn btn-primary" onClick={() => saveRow(r)} disabled={busyId === r.id}>
                      {busyId === r.id ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => deleteRow(r)} disabled={busyId === r.id}>
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
