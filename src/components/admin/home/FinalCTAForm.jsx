'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';

export default function FinalCTAForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      final_cta_title: data.final_cta_title || '',
      final_cta_subtitle: data.final_cta_subtitle || '',
      final_cta_label: data.final_cta_label || '',
      final_cta_href: data.final_cta_href || '',
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const save = () => {
    onSave?.({
      final_cta_title: draft.final_cta_title,
      final_cta_subtitle: draft.final_cta_subtitle || null,
      final_cta_label: draft.final_cta_label,
      final_cta_href: draft.final_cta_href,
    });
  };

  return (
    <AdminCard title="Final CTA">
      <TextInput label="Title" value={draft.final_cta_title} onChange={(v) => set('final_cta_title', v)} required />
      <TextArea label="Subtitle" value={draft.final_cta_subtitle} onChange={(v) => set('final_cta_subtitle', v)} rows={3} />
      <div className="row g-2">
        <div className="col-md-6">
          <TextInput label="Button Label" value={draft.final_cta_label} onChange={(v) => set('final_cta_label', v)} required />
        </div>
        <div className="col-md-6">
          <TextInput label="Button Href" value={draft.final_cta_href} onChange={(v) => set('final_cta_href', v)} required />
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Final CTA'}
      </button>
    </AdminCard>
  );
}
