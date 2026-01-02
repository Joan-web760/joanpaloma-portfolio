'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Repeater from '@/components/admin/forms/Repeater';

export default function ServicesForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    const primary = data.primary_service && typeof data.primary_service === 'object'
      ? data.primary_service
      : { title: '', desc: '', icon: '' };

    setDraft({
      title: data.title || '',
      subtitle: data.subtitle || '',
      overview_title: data.overview_title || '',
      overview_body: data.overview_body || '',
      primary_service: {
        title: primary.title || '',
        desc: primary.desc || '',
        icon: primary.icon || '',
      },
      additional_services_title: data.additional_services_title || '',
      additional_services: Array.isArray(data.additional_services) ? data.additional_services : [],
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const setPrimary = (k, v) =>
    setDraft((p) => ({ ...p, primary_service: { ...(p.primary_service || {}), [k]: v } }));

  const save = () => {
    onSave?.({
      title: draft.title,
      subtitle: draft.subtitle || null,
      overview_title: draft.overview_title || null,
      overview_body: draft.overview_body || null,
      primary_service: {
        title: draft.primary_service?.title || '',
        desc: draft.primary_service?.desc || '',
        icon: draft.primary_service?.icon || '',
      },
      additional_services_title: draft.additional_services_title || null,
      additional_services: draft.additional_services || [],
    });
  };

  return (
    <AdminCard title="Services Content">
      <div className="row g-2">
        <div className="col-md-6">
          <TextInput label="Page Title" value={draft.title} onChange={(v) => set('title', v)} required />
        </div>
        <div className="col-md-6">
          <TextInput label="Page Subtitle" value={draft.subtitle} onChange={(v) => set('subtitle', v)} />
        </div>
      </div>

      <hr className="border-secondary" />

      <TextInput label="Overview Title" value={draft.overview_title} onChange={(v) => set('overview_title', v)} />
      <TextArea label="Overview Body" value={draft.overview_body} onChange={(v) => set('overview_body', v)} rows={5} />

      <hr className="border-secondary" />

      <div className="fw-semibold mb-2">Primary Service</div>
      <div className="row g-2">
        <div className="col-md-4">
          <TextInput
            label="Title"
            value={draft.primary_service?.title}
            onChange={(v) => setPrimary('title', v)}
            placeholder="Custom Dashboards"
          />
        </div>
        <div className="col-md-4">
          <TextInput
            label="Icon Class"
            value={draft.primary_service?.icon}
            onChange={(v) => setPrimary('icon', v)}
            placeholder="fa-solid fa-star"
          />
        </div>
        <div className="col-md-12">
          <TextArea
            label="Description"
            value={draft.primary_service?.desc}
            onChange={(v) => setPrimary('desc', v)}
            rows={4}
          />
        </div>
      </div>

      <hr className="border-secondary" />

      <TextInput
        label="Additional Services Title"
        value={draft.additional_services_title}
        onChange={(v) => set('additional_services_title', v)}
      />

      <Repeater
        label="Additional Services"
        value={draft.additional_services}
        onChange={(v) => set('additional_services', v)}
        itemLabel="Service"
        fields={[
          { key: 'title', label: 'Title', placeholder: 'APIs' },
          { key: 'desc', label: 'Description', placeholder: 'Laravel / Express APIs' },
          { key: 'icon', label: 'Icon Class', placeholder: 'fa-solid fa-code' },
        ]}
      />

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Services'}
      </button>
    </AdminCard>
  );
}
