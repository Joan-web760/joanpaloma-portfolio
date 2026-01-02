'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import ImageUpload from '@/components/admin/forms/ImageUpload';

export default function HeroForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      hero_title: data.hero_title || '',
      hero_subtitle: data.hero_subtitle || '',
      hero_cta_label: data.hero_cta_label || '',
      hero_cta_href: data.hero_cta_href || '',
      hero_image_bucket: data.hero_image_bucket || '',
      hero_image_path: data.hero_image_path || '',
      hero_image_url: data.hero_image_url || '',
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const save = () => {
    onSave?.({
      hero_title: draft.hero_title,
      hero_subtitle: draft.hero_subtitle,
      hero_cta_label: draft.hero_cta_label,
      hero_cta_href: draft.hero_cta_href,
      hero_image_url: draft.hero_image_url || null,
      hero_image_bucket: draft.hero_image_bucket || null,
      hero_image_path: draft.hero_image_path || null,
    });
  };

  return (
    <AdminCard title="Hero">
      <TextInput label="Title" value={draft.hero_title} onChange={(v) => set('hero_title', v)} required />
      <TextInput label="Subtitle" value={draft.hero_subtitle} onChange={(v) => set('hero_subtitle', v)} />
      <div className="row g-2">
        <div className="col-md-6">
          <TextInput label="CTA Label" value={draft.hero_cta_label} onChange={(v) => set('hero_cta_label', v)} />
        </div>
        <div className="col-md-6">
          <TextInput label="CTA Href" value={draft.hero_cta_href} onChange={(v) => set('hero_cta_href', v)} />
        </div>
      </div>

      <TextInput
        label="Hero Image URL (optional)"
        value={draft.hero_image_url}
        onChange={(v) => set('hero_image_url', v)}
        placeholder="https://..."
      />

      <ImageUpload
        label="Upload Hero Image (optional)"
        bucket="site"
        folder="home"
        value={draft.hero_image_bucket && draft.hero_image_path ? { bucket: draft.hero_image_bucket, path: draft.hero_image_path } : null}
        onChange={({ bucket, path }) => {
          set('hero_image_bucket', bucket);
          set('hero_image_path', path);
          set('hero_image_url', '');
        }}
      />

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Hero'}
      </button>
    </AdminCard>
  );
}
