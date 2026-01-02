'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Repeater from '@/components/admin/forms/Repeater';

export default function SnapshotForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      snapshot_title: data.snapshot_title || '',
      snapshot_items: Array.isArray(data.snapshot_items) ? data.snapshot_items : [],
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const save = () => {
    onSave?.({
      snapshot_title: draft.snapshot_title || null,
      snapshot_items: draft.snapshot_items || [],
    });
  };

  return (
    <AdminCard title="Core Services Snapshot">
      <TextInput label="Section Title" value={draft.snapshot_title} onChange={(v) => set('snapshot_title', v)} />

      <Repeater
        label="Snapshot Items"
        value={draft.snapshot_items}
        onChange={(v) => set('snapshot_items', v)}
        itemLabel="Service"
        fields={[
          { key: 'title', label: 'Title', placeholder: 'Web Apps' },
          { key: 'desc', label: 'Description', placeholder: 'Next.js / Nuxt builds' },
          { key: 'icon', label: 'Icon Class', placeholder: 'fa-solid fa-bolt' },
        ]}
      />

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Snapshot'}
      </button>
    </AdminCard>
  );
}
