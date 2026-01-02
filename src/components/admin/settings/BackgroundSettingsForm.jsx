'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Select from '@/components/admin/forms/Select';
import Toggle from '@/components/admin/forms/Toggle';
import ImageUpload from '@/components/admin/forms/ImageUpload';

const TYPE_OPTIONS = [
  { label: 'Gradient', value: 'gradient' },
  { label: 'Color', value: 'color' },
  { label: 'Image', value: 'image' },
];

const sanitizeCssValue = (v) => (v || '').trim().replace(/;+\s*$/, '');

export default function BackgroundSettingsForm({ bg, setBg, onReload }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const update = (key, value) => setBg((p) => ({ ...(p || { id: true }), [key]: value }));

  const broadcast = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('site-background-updated'));
    }
  };

  const save = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    try {
      const payload = {
        id: true,

        background_type: bg?.background_type || 'gradient',
        background_color: sanitizeCssValue(bg?.background_color) || '#0b1220',
        gradient_css:
          sanitizeCssValue(bg?.gradient_css) ||
          'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.25), transparent 45%), radial-gradient(900px circle at 80% 30%, rgba(168,85,247,.20), transparent 40%), linear-gradient(180deg, #0b1220, #070b14)',
        image_path: bg?.image_path || null,

        overlay_enabled: !!bg?.overlay_enabled,
        overlay_color: sanitizeCssValue(bg?.overlay_color) || 'rgba(0,0,0,0.55)',
        overlay_blur_px: Number.isFinite(Number(bg?.overlay_blur_px)) ? Number(bg.overlay_blur_px) : 0,
      };

      const { data, error } = await supabase
        .from('site_background_settings')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) throw error;

      setBg(data);
      setMsg({ type: 'success', text: 'Saved.' });

      // ✅ update background immediately without navigation
      broadcast();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message || 'Failed to save.' });
    } finally {
      setBusy(false);
    }
  };

  const reload = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    try {
      await onReload?.();
      setMsg({ type: 'success', text: 'Reloaded.' });

      // ✅ also refresh BackgroundWrapper immediately
      broadcast();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message || 'Failed to reload.' });
    } finally {
      setBusy(false);
    }
  };

  const effective = bg || {
    id: true,
    background_type: 'gradient',
    background_color: '#0b1220',
    gradient_css:
      'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.25), transparent 45%), radial-gradient(900px circle at 80% 30%, rgba(168,85,247,.20), transparent 40%), linear-gradient(180deg, #0b1220, #070b14)',
    image_path: null,
    overlay_enabled: true,
    overlay_color: 'rgba(0,0,0,0.55)',
    overlay_blur_px: 0,
  };

  return (
    <AdminCard title="Background Settings">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <Select
        label="Background Type"
        value={effective.background_type || 'gradient'}
        onChange={(v) => update('background_type', v)}
        options={TYPE_OPTIONS}
      />

      {effective.background_type === 'color' ? (
        <TextInput
          label="Background Color"
          value={effective.background_color || '#0b1220'}
          onChange={(v) => update('background_color', v)}
          placeholder="#0b1220"
        />
      ) : null}

      {effective.background_type === 'gradient' ? (
        <TextInput
          label="Gradient CSS"
          value={effective.gradient_css || ''}
          onChange={(v) => update('gradient_css', v)}
          placeholder="linear-gradient(...) or radial-gradient(...)"
        />
      ) : null}

      {effective.background_type === 'image' ? (
        <>
          <ImageUpload
            label="Upload Background Image"
            bucket="site"
            folder="background"
            value={effective.image_path ? { bucket: 'site', path: effective.image_path } : null}
            onChange={({ path }) => update('image_path', path)}
          />

          {/* <div className="small opacity-75">
            Saved to <code>site_background_settings.image_path</code>
          </div> */}
        </>
      ) : null}

      <hr className="border-secondary my-3" />

      <Toggle
        label="Overlay Enabled"
        checked={!!effective.overlay_enabled}
        onChange={(v) => update('overlay_enabled', v)}
      />

      <TextInput
        label="Overlay Color"
        value={effective.overlay_color || 'rgba(0,0,0,0.55)'}
        onChange={(v) => update('overlay_color', v)}
        placeholder="rgba(0,0,0,0.55)"
      />

      <TextInput
        label="Overlay Blur (px)"
        value={String(effective.overlay_blur_px ?? 0)}
        onChange={(v) => update('overlay_blur_px', Number(v) || 0)}
        placeholder="0"
      />

      <div className="d-flex gap-2 flex-wrap mt-3">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </button>

        <button className="btn btn-outline-secondary" onClick={reload} disabled={busy}>
          {busy ? 'Reloading...' : 'Reload'}
        </button>
      </div>
    </AdminCard>
  );
}
