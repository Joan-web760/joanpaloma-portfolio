'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Toggle from '@/components/admin/forms/Toggle';
import Repeater from '@/components/admin/forms/Repeater';

export default function PricingForm({ settings, setSettings, plans, setPlans, onReload }) {
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(plans?.[0]?.id || null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const list = useMemo(() => plans || [], [plans]);

  const updatePlanLocal = (id, patch) => {
    setPlans((prev) => (prev || []).map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const normalizeCta = (cta) => {
    const x = cta && typeof cta === 'object' ? cta : {};
    return { label: x.label || 'Contact', href: x.href || '/contact' };
  };

  const setPlanCta = (plan, key, value) => {
    updatePlanLocal(plan.id, { cta: { ...normalizeCta(plan.cta), [key]: value } });
  };

  const createPlan = async () => {
    setMsg({ type: '', text: '' });
    setBusyId('new');

    const payload = {
      title: 'New Plan',
      subtitle: '',
      price_label: '',
      billing_note: '',
      features: [],
      cta: { label: 'Contact', href: '/contact' },
      is_enabled: true,
      is_featured: false,
      sort_order: (list?.[list.length - 1]?.sort_order || 0) + 10,
    };

    const { data, error } = await supabase.from('pricing_plans').insert(payload).select('*').single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setPlans((prev) => [...(prev || []), data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    setExpandedId(data.id);
    setMsg({ type: 'success', text: 'Created.' });
  };

  const saveSettings = async () => {
    if (!settings) return;

    setMsg({ type: '', text: '' });
    setBusyId('settings');

    const patch = {
      title: settings.title || 'Pricing',
      subtitle: settings.subtitle || null,
      note: settings.note || null,
      is_enabled: !!settings.is_enabled,
    };

    const { data, error } = await supabase
      .from('pricing_page_settings')
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

  const savePlan = async (p) => {
    setMsg({ type: '', text: '' });
    setBusyId(p.id);

    const clean = {
      is_enabled: !!p.is_enabled,
      is_featured: !!p.is_featured,
      title: p.title || '',
      subtitle: p.subtitle || null,
      price_label: p.price_label || null,
      billing_note: p.billing_note || null,
      features: Array.isArray(p.features) ? p.features : [],
      cta: normalizeCta(p.cta),
      sort_order: Number.isFinite(p.sort_order) ? p.sort_order : 0,
    };

    const { data, error } = await supabase.from('pricing_plans').update(clean).eq('id', p.id).select('*').single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setPlans((prev) => (prev || []).map((x) => (x.id === p.id ? data : x)));
    setMsg({ type: 'success', text: 'Saved.' });
  };

  const deletePlan = async (p) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;

    setMsg({ type: '', text: '' });
    setBusyId(p.id);

    const { error } = await supabase.from('pricing_plans').delete().eq('id', p.id);

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setPlans((prev) => (prev || []).filter((x) => x.id !== p.id));
    setMsg({ type: 'success', text: 'Deleted.' });
    if (expandedId === p.id) setExpandedId(null);
  };

  const move = (id, dir) => {
    setPlans((prev) => {
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

        <TextArea
          label="Note (optional)"
          value={settings?.note || ''}
          onChange={(v) => setSettings((p) => ({ ...(p || {}), note: v }))}
          rows={3}
        />

        <Toggle
          label="Enabled"
          checked={!!settings?.is_enabled}
          onChange={(v) => setSettings((p) => ({ ...(p || {}), is_enabled: v }))}
          hint="Disable to hide pricing page publicly."
        />

        <button className="btn btn-primary" onClick={saveSettings} disabled={busyId === 'settings'}>
          {busyId === 'settings' ? 'Saving...' : 'Save Page Settings'}
        </button>
      </AdminCard>

      <AdminCard title="Plans">
        <div className="d-flex gap-2 flex-wrap mb-2">
          <button className="btn btn-outline-light" onClick={createPlan} disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Creating...' : '+ Add Plan'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onReload}>
            Reload
          </button>
        </div>

        {list.length === 0 ? <div className="text-center opacity-75 py-4">No plans yet.</div> : null}

        <div className="d-flex flex-column gap-2">
          {list.map((p, index) => {
            const open = expandedId === p.id;
            const cta = normalizeCta(p.cta);

            return (
              <div key={p.id} className="card bg-black border border-secondary">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="fw-semibold">
                      {p.title || 'Untitled'}
                      {p.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
                      {!p.is_enabled ? <span className="badge text-bg-secondary ms-2">Disabled</span> : null}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => setExpandedId(open ? null : p.id)}
                      >
                        {open ? 'Collapse' : 'Edit'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => move(p.id, -1)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <i className="fa-solid fa-arrow-up" />
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => move(p.id, 1)}
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
                        <div className="col-md-6">
                          <TextInput label="Title" value={p.title || ''} onChange={(v) => updatePlanLocal(p.id, { title: v })} />
                        </div>
                        <div className="col-md-6">
                          <TextInput
                            label="Subtitle"
                            value={p.subtitle || ''}
                            onChange={(v) => updatePlanLocal(p.id, { subtitle: v })}
                          />
                        </div>
                        <div className="col-md-6">
                          <TextInput
                            label="Price Label"
                            value={p.price_label || ''}
                            onChange={(v) => updatePlanLocal(p.id, { price_label: v })}
                            placeholder="Starts at ₱45,000"
                          />
                        </div>
                        <div className="col-md-6">
                          <TextInput
                            label="Billing Note"
                            value={p.billing_note || ''}
                            onChange={(v) => updatePlanLocal(p.id, { billing_note: v })}
                            placeholder="one-time / per month / project-based"
                          />
                        </div>
                      </div>

                      <Toggle
                        label="Enabled"
                        checked={!!p.is_enabled}
                        onChange={(v) => updatePlanLocal(p.id, { is_enabled: v })}
                      />

                      <Toggle
                        label="Featured"
                        checked={!!p.is_featured}
                        onChange={(v) => updatePlanLocal(p.id, { is_featured: v })}
                      />

                      <Repeater
                        label="Features"
                        value={Array.isArray(p.features) ? p.features : []}
                        onChange={(v) => updatePlanLocal(p.id, { features: v })}
                        itemLabel="Feature"
                      />

                      <hr className="border-secondary" />

                      <div className="fw-semibold mb-2">CTA</div>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <TextInput label="CTA Label" value={cta.label} onChange={(v) => setPlanCta(p, 'label', v)} />
                        </div>
                        <div className="col-md-6">
                          <TextInput label="CTA Href" value={cta.href} onChange={(v) => setPlanCta(p, 'href', v)} />
                        </div>
                      </div>

                      <div className="row g-2">
                        <div className="col-md-4">
                          <TextInput
                            label="Sort Order"
                            value={String(p.sort_order ?? 0)}
                            onChange={(v) => updatePlanLocal(p.id, { sort_order: parseInt(v || '0', 10) })}
                          />
                        </div>
                      </div>

                      <div className="d-flex gap-2 flex-wrap mt-2">
                        <button className="btn btn-primary" onClick={() => savePlan(p)} disabled={busyId === p.id}>
                          {busyId === p.id ? 'Saving...' : 'Save Plan'}
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => deletePlan(p)} disabled={busyId === p.id}>
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
