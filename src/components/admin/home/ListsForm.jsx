'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Repeater from '@/components/admin/forms/Repeater';

export default function ListsForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      list_col1_title: data.list_col1_title || '',
      list_col1_items: Array.isArray(data.list_col1_items) ? data.list_col1_items : [],
      list_col2_title: data.list_col2_title || '',
      list_col2_items: Array.isArray(data.list_col2_items) ? data.list_col2_items : [],
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const save = () => {
    onSave?.({
      list_col1_title: draft.list_col1_title || null,
      list_col1_items: draft.list_col1_items || [],
      list_col2_title: draft.list_col2_title || null,
      list_col2_items: draft.list_col2_items || [],
    });
  };

  return (
    <AdminCard title="List Columns">
      <div className="row g-3">
        <div className="col-lg-6">
          <TextInput label="Column 1 Title" value={draft.list_col1_title} onChange={(v) => set('list_col1_title', v)} />
          <Repeater
            label="Column 1 Items"
            value={draft.list_col1_items}
            onChange={(v) => set('list_col1_items', v)}
            itemLabel="Item"
          />
        </div>

        <div className="col-lg-6">
          <TextInput label="Column 2 Title" value={draft.list_col2_title} onChange={(v) => set('list_col2_title', v)} />
          <Repeater
            label="Column 2 Items"
            value={draft.list_col2_items}
            onChange={(v) => set('list_col2_items', v)}
            itemLabel="Item"
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Lists'}
      </button>
    </AdminCard>
  );
}
