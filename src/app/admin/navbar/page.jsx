'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const emptyLink = () => ({
  id: null,
  label: '',
  href: '',
  sort_order: 0,
  is_enabled: true,
});

export default function AdminNavbarPage() {
  const [settings, setSettings] = useState(null);
  const [links, setLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [links]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setMsg('');

      const [settingsRes, linksRes] = await Promise.all([
        supabase.from('site_navbar_settings').select('*').eq('id', true).single(),
        supabase.from('site_navbar_links').select('*').order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setSettings(settingsRes.data || null);
      setLinks(linksRes.data || []);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const updateSettingsField = (key, value) => {
    setSettings((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const updateLinkField = (idx, key, value) => {
    setLinks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const addLink = () => {
    setLinks((prev) => {
      const maxSort = prev.reduce((m, x) => Math.max(m, x.sort_order || 0), 0);
      return [...prev, { ...emptyLink(), sort_order: maxSort + 10 }];
    });
  };

  const removeLink = async (idx) => {
    const item = links[idx];
    if (!item) return;

    // if unsaved locally
    if (!item.id) {
      setLinks((prev) => prev.filter((_, i) => i !== idx));
      return;
    }

    setSaving(true);
    setMsg('');
    const { error } = await supabase.from('site_navbar_links').delete().eq('id', item.id);
    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setLinks((prev) => prev.filter((_, i) => i !== idx));
    setMsg('Link deleted.');
  };

  const saveAll = async () => {
    setSaving(true);
    setMsg('');

    // 1) save settings (single row)
    const { error: settingsError } = await supabase
      .from('site_navbar_settings')
      .update({
        brand_label: settings?.brand_label ?? 'Brand',
        brand_href: settings?.brand_href ?? '/',
        cta_label: settings?.cta_label ?? 'Book a Call',
        cta_href: settings?.cta_href ?? '/contact',
        cta_enabled: !!settings?.cta_enabled,
      })
      .eq('id', true);

    if (settingsError) {
      setSaving(false);
      setMsg(settingsError.message);
      return;
    }

    // 2) upsert links
    // Ensure sort_order numbers are persisted as ints
    const payload = links.map((l) => ({
      id: l.id || undefined,
      label: l.label,
      href: l.href,
      sort_order: Number.isFinite(+l.sort_order) ? parseInt(l.sort_order, 10) : 0,
      is_enabled: !!l.is_enabled,
    }));

    const { data: upserted, error: linksError } = await supabase
      .from('site_navbar_links')
      .upsert(payload, { onConflict: 'id' })
      .select('*');

    setSaving(false);

    if (linksError) {
      setMsg(linksError.message);
      return;
    }

    setLinks(upserted || []);
    setMsg('Saved successfully.');
  };

  if (loading) {
    return (
      <div className="container py-4">
        <h1 className="h4">Navbar Settings</h1>
        <div className="opacity-75">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Navbar Settings</h1>
        <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {msg ? <div className="alert alert-info">{msg}</div> : null}

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Brand Label</label>
              <input
                className="form-control"
                value={settings?.brand_label || ''}
                onChange={(e) => updateSettingsField('brand_label', e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Brand Href</label>
              <input
                className="form-control"
                value={settings?.brand_href || ''}
                onChange={(e) => updateSettingsField('brand_href', e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">CTA Label</label>
              <input
                className="form-control"
                value={settings?.cta_label || ''}
                onChange={(e) => updateSettingsField('cta_label', e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label">CTA Href</label>
              <input
                className="form-control"
                value={settings?.cta_href || ''}
                onChange={(e) => updateSettingsField('cta_href', e.target.value)}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ctaEnabled"
                  checked={!!settings?.cta_enabled}
                  onChange={(e) => updateSettingsField('cta_enabled', e.target.checked)}
                />
                <label className="form-check-label" htmlFor="ctaEnabled">
                  CTA Enabled
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="h5 mb-0">Links</h2>
        <button className="btn btn-outline-secondary" onClick={addLink} disabled={saving}>
          Add Link
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {sortedLinks.length === 0 ? (
            <div className="opacity-75">No links yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>Label</th>
                    <th>Href</th>
                    <th style={{ width: 140 }}>Sort</th>
                    <th style={{ width: 120 }}>Enabled</th>
                    <th style={{ width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {sortedLinks.map((item, idx) => (
                    <tr key={item.id || `new-${idx}`}>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={item.label}
                          onChange={(e) => updateLinkField(idx, 'label', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          value={item.href}
                          onChange={(e) => updateLinkField(idx, 'href', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control form-control-sm"
                          type="number"
                          value={item.sort_order}
                          onChange={(e) => updateLinkField(idx, 'sort_order', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!!item.is_enabled}
                          onChange={(e) => updateLinkField(idx, 'is_enabled', e.target.checked)}
                        />
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeLink(idx)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="small opacity-75 mt-2">
            Tip: Use sort order like 10, 20, 30 so you can insert items later without renumbering everything.
          </div>
        </div>
      </div>
    </div>
  );
}
