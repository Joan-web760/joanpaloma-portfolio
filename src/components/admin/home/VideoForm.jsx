'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';

export default function VideoForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      video_label: data.video_label || '',
      video_url: data.video_url || '',
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const save = () => {
    onSave?.({
      video_label: draft.video_label || null,
      video_url: draft.video_url || null,
    });
  };

  return (
    <AdminCard title="Video Intro">
      <TextInput label="Label" value={draft.video_label} onChange={(v) => set('video_label', v)} />
      <TextInput label="Video URL" value={draft.video_url} onChange={(v) => set('video_url', v)} placeholder="https://..." />
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Video'}
      </button>
    </AdminCard>
  );
}
