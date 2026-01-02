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

const IMAGE_REPEAT_OPTIONS = [
  { label: 'No repeat', value: 'no-repeat' },
  { label: 'Repeat', value: 'repeat' },
  { label: 'Repeat X', value: 'repeat-x' },
  { label: 'Repeat Y', value: 'repeat-y' },
];

const IMAGE_SIZE_OPTIONS = [
  { label: 'Cover', value: 'cover' },
  { label: 'Contain', value: 'contain' },
  { label: 'Auto', value: 'auto' },
];

const IMAGE_POSITION_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Top Left', value: 'top left' },
  { label: 'Top Right', value: 'top right' },
  { label: 'Bottom Left', value: 'bottom left' },
  { label: 'Bottom Right', value: 'bottom right' },
];

const IMAGE_ATTACHMENT_OPTIONS = [
  { label: 'Scroll (default)', value: 'scroll' },
  { label: 'Fixed', value: 'fixed' },
  { label: 'Local', value: 'local' },
];

const sanitizeCssValue = (v) => (v || '').trim().replace(/;+\s*$/, '');

export default function BackgroundSettingsForm({ bg, setBg, onReload }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // local update only (no DB)
  const update = (key, value) => setBg((p) => ({ ...(p || { id: true }), [key]: value }));

  const broadcast = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('site-background-updated'));
  };

  const buildPayload = (overrides = {}) => {
    const next = { ...(bg || {}), ...overrides };

    return {
      id: true,

      background_type: next.background_type || 'gradient',
      background_color: sanitizeCssValue(next.background_color) || '#0b1220',
      gradient_css:
        sanitizeCssValue(next.gradient_css) ||
        'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.25), transparent 45%), radial-gradient(900px circle at 80% 30%, rgba(168,85,247,.20), transparent 40%), linear-gradient(180deg, #0b1220, #070b14)',

      image_path: next.image_path || null,

      // image behavior settings
      image_repeat: next.image_repeat || 'no-repeat',
      image_size: next.image_size || 'cover',
      image_position: next.image_position || 'center',
      image_attachment: next.image_attachment || 'scroll',

      overlay_enabled: !!next.overlay_enabled,
      overlay_color: sanitizeCssValue(next.overlay_color) || 'rgba(0,0,0,0.55)',
      overlay_blur_px: Number.isFinite(Number(next.overlay_blur_px)) ? Number(next.overlay_blur_px) : 0,
    };
  };

  const persist = async (overrides = {}, successText = 'Saved.') => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    try {
      const payload = buildPayload(overrides);

      const { data, error } = await supabase
        .from('site_background_settings')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) throw error;

      setBg(data);
      setMsg({ type: 'success', text: successText });
      broadcast();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message || 'Failed.' });
    } finally {
      setBusy(false);
    }
  };

  // ✅ helper: update local + persist DB immediately
  const updateAndPersist = async (key, value, successText = 'Saved.') => {
    // update UI instantly
    setBg((p) => ({ ...(p || { id: true }), [key]: value }));
    // persist DB + apply everywhere
    await persist({ [key]: value }, successText);
  };

  const save = async () => persist({}, 'Saved.');

  const reload = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    try {
      await onReload?.();
      setMsg({ type: 'success', text: 'Reloaded.' });
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

    image_repeat: 'no-repeat',
    image_size: 'cover',
    image_position: 'center',
    image_attachment: 'scroll',

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
            onChange={async ({ path }) => {
              // instant UI
              setBg((p) => ({
                ...(p || { id: true }),
                background_type: 'image',
                image_path: path,
              }));

              // persist image_path
              await persist({ background_type: 'image', image_path: path }, 'Image uploaded & applied.');
            }}
          />

          {/* ✅ These now SAVE immediately */}
          <Select
            label="Image Repeat"
            value={effective.image_repeat || 'no-repeat'}
            onChange={(v) => updateAndPersist('image_repeat', v, 'Image repeat saved.')}
            options={IMAGE_REPEAT_OPTIONS}
          />

          <Select
            label="Image Size"
            value={effective.image_size || 'cover'}
            onChange={(v) => updateAndPersist('image_size', v, 'Image size saved.')}
            options={IMAGE_SIZE_OPTIONS}
          />

          <Select
            label="Image Position"
            value={effective.image_position || 'center'}
            onChange={(v) => updateAndPersist('image_position', v, 'Image position saved.')}
            options={IMAGE_POSITION_OPTIONS}
          />

          <Select
            label="Image Attachment"
            value={effective.image_attachment || 'scroll'}
            onChange={(v) => updateAndPersist('image_attachment', v, 'Image attachment saved.')}
            options={IMAGE_ATTACHMENT_OPTIONS}
          />
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
