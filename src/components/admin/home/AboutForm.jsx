'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import ImageUpload from '@/components/admin/forms/ImageUpload';

export default function AboutForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      about_title: data.about_title || '',
      about_body: data.about_body || '',
      about_image_url: data.about_image_url || '',
      about_image_bucket: data.about_image_bucket || '',
      about_image_path: data.about_image_path || '',
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const save = () => {
    onSave?.({
      about_title: draft.about_title,
      about_body: draft.about_body,
      about_image_url: draft.about_image_url || null,
      about_image_bucket: draft.about_image_bucket || null,
      about_image_path: draft.about_image_path || null,
    });
  };

  return (
    <AdminCard title="About">
      <TextInput label="Title" value={draft.about_title} onChange={(v) => set('about_title', v)} required />
      <TextArea label="Body" value={draft.about_body} onChange={(v) => set('about_body', v)} rows={6} required />

      <TextInput
        label="About Image URL (optional)"
        value={draft.about_image_url}
        onChange={(v) => set('about_image_url', v)}
        placeholder="https://..."
      />

      <ImageUpload
        label="Upload About Image (optional)"
        bucket="site"
        folder="home"
        value={draft.about_image_bucket && draft.about_image_path ? { bucket: draft.about_image_bucket, path: draft.about_image_path } : null}
        onChange={({ bucket, path }) => {
          set('about_image_bucket', bucket);
          set('about_image_path', path);
          set('about_image_url', '');
        }}
      />

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save About'}
      </button>
    </AdminCard>
  );
}
