'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Select from '@/components/admin/forms/Select';
import Toggle from '@/components/admin/forms/Toggle';
import ImageUpload from '@/components/admin/forms/ImageUpload';

const MODE_OPTIONS = [
  { label: 'Gradient', value: 'gradient' },
  { label: 'Image', value: 'image' },
  { label: 'Pattern', value: 'pattern' },
  { label: 'None', value: 'none' },
];

const PATTERN_OPTIONS = [
  { label: 'Dots', value: 'dots' },
  { label: 'Grid', value: 'grid' },
  { label: 'Noise', value: 'noise' },
  { label: 'Diagonal', value: 'diagonal' },
];

export default function BackgroundSettingsForm({ bg, setBg, onReload }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const save = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    const patch = {
      is_enabled: !!bg?.is_enabled,

      mode: bg?.mode || 'gradient',

      gradient_from: bg?.gradient_from || null,
      gradient_to: bg?.gradient_to || null,
      gradient_angle: parseInt(bg?.gradient_angle ?? 135, 10),

      image_url: bg?.image_url || null,
      image_bucket: bg?.image_bucket || null,
      image_path: bg?.image_path || null,
      image_opacity: Number(bg?.image_opacity ?? 0.22),
      image_blur_px: parseInt(bg?.image_blur_px ?? 0, 10),

      pattern_name: bg?.pattern_name || null,
      pattern_opacity: Number(bg?.pattern_opacity ?? 0.18),
    };

    const { data, error } = await supabase
      .from('background_settings')
      .update(patch)
      .eq('id', true)
      .select('*')
      .single();

    setBusy(false);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setBg(data);
    setMsg({ type: 'success', text: 'Saved.' });
  };

  if (!bg) return <div className="opacity-75">Missing background settings row.</div>;

  return (
    <AdminCard title="Background Settings">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <Toggle
        label="Enabled"
        checked={!!bg.is_enabled}
        onChange={(v) => setBg((p) => ({ ...p, is_enabled: v }))}
      />

      <Select
        label="Mode"
        value={bg.mode || 'gradient'}
        onChange={(v) => setBg((p) => ({ ...p, mode: v }))}
        options={MODE_OPTIONS}
      />

      {bg.mode === 'gradient' ? (
        <>
          <TextInput
            label="Gradient From (hex)"
            value={bg.gradient_from || ''}
            onChange={(v) => setBg((p) => ({ ...p, gradient_from: v }))}
            placeholder="#0b1220"
          />
          <TextInput
            label="Gradient To (hex)"
            value={bg.gradient_to || ''}
            onChange={(v) => setBg((p) => ({ ...p, gradient_to: v }))}
            placeholder="#111827"
          />
          <TextInput
            label="Gradient Angle"
            value={String(bg.gradient_angle ?? 135)}
            onChange={(v) => setBg((p) => ({ ...p, gradient_angle: parseInt(v || '135', 10) }))}
            placeholder="135"
          />
        </>
      ) : null}

      {bg.mode === 'image' ? (
        <>
          <TextInput
            label="Image URL (optional)"
            value={bg.image_url || ''}
            onChange={(v) =>
              setBg((p) => ({
                ...p,
                image_url: v,
                image_bucket: null,
                image_path: null,
              }))
            }
            placeholder="https://..."
          />

          <ImageUpload
            label="Upload Background Image (optional)"
            bucket="site"
            folder="background"
            value={bg.image_bucket && bg.image_path ? { bucket: bg.image_bucket, path: bg.image_path } : null}
            onChange={({ bucket, path }) =>
              setBg((p) => ({
                ...p,
                image_bucket: bucket,
                image_path: path,
                image_url: '',
              }))
            }
          />

          <TextInput
            label="Image Opacity (0 to 1)"
            value={String(bg.image_opacity ?? 0.22)}
            onChange={(v) => setBg((p) => ({ ...p, image_opacity: v }))}
            placeholder="0.22"
          />

          <TextInput
            label="Image Blur (px)"
            value={String(bg.image_blur_px ?? 0)}
            onChange={(v) => setBg((p) => ({ ...p, image_blur_px: parseInt(v || '0', 10) }))}
            placeholder="0"
          />
        </>
      ) : null}

      {bg.mode === 'pattern' ? (
        <>
          <Select
            label="Pattern"
            value={bg.pattern_name || 'dots'}
            onChange={(v) => setBg((p) => ({ ...p, pattern_name: v }))}
            options={PATTERN_OPTIONS}
          />
          <TextInput
            label="Pattern Opacity (0 to 1)"
            value={String(bg.pattern_opacity ?? 0.18)}
            onChange={(v) => setBg((p) => ({ ...p, pattern_opacity: v }))}
            placeholder="0.18"
          />
        </>
      ) : null}

      <div className="d-flex gap-2 flex-wrap mt-2">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </button>
        <button className="btn btn-outline-secondary" onClick={onReload} disabled={busy}>
          Reload
        </button>
      </div>
    </AdminCard>
  );
}
