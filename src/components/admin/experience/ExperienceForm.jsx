'use client';

import { useEffect, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import TagInput from '@/components/admin/forms/TagInput';

export default function ExperienceForm({ data, onSave, saving }) {
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      title: data.title || '',
      subtitle: data.subtitle || '',
      items: Array.isArray(data.items) ? data.items : [],
    });
  }, [data]);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const addItem = () => {
    setDraft((p) => ({
      ...p,
      items: [
        ...(p.items || []),
        {
          title: '',
          company: '',
          location: '',
          start: '',
          end: '',
          description: '',
          tags: [],
          href: '',
          icon: 'fa-solid fa-briefcase',
        },
      ],
    }));
  };

  const removeItem = (idx) => {
    setDraft((p) => ({ ...p, items: (p.items || []).filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, patch) => {
    setDraft((p) => ({
      ...p,
      items: (p.items || []).map((it, i) => (i === idx ? { ...(it || {}), ...patch } : it)),
    }));
  };

  const move = (from, to) => {
    setDraft((p) => {
      const arr = [...(p.items || [])];
      if (to < 0 || to >= arr.length) return p;
      const [x] = arr.splice(from, 1);
      arr.splice(to, 0, x);
      return { ...p, items: arr };
    });
  };

  const save = () => {
    onSave?.({
      title: draft.title,
      subtitle: draft.subtitle || null,
      items: draft.items || [],
    });
  };

  return (
    <AdminCard title="Experience Timeline">
      <div className="row g-2">
        <div className="col-md-6">
          <TextInput label="Page Title" value={draft.title} onChange={(v) => set('title', v)} required />
        </div>
        <div className="col-md-6">
          <TextInput label="Page Subtitle" value={draft.subtitle} onChange={(v) => set('subtitle', v)} />
        </div>
      </div>

      <hr className="border-secondary" />

      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="fw-semibold">Timeline Items</div>
        <button type="button" className="btn btn-outline-light btn-sm" onClick={addItem}>
          + Add Item
        </button>
      </div>

      <div className="d-flex flex-column gap-2">
        {(draft.items || []).map((it, idx) => (
          <div key={idx} className="card bg-black border border-secondary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="small opacity-75">Item #{idx + 1}</div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => move(idx, idx - 1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    <i className="fa-solid fa-arrow-up" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => move(idx, idx + 1)}
                    disabled={idx === (draft.items || []).length - 1}
                    title="Move down"
                  >
                    <i className="fa-solid fa-arrow-down" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeItem(idx)}
                    title="Remove"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <TextInput
                    label="Title / Role"
                    value={it.title || ''}
                    onChange={(v) => updateItem(idx, { title: v })}
                    placeholder="Full Stack Developer"
                  />
                </div>
                <div className="col-md-6">
                  <TextInput
                    label="Company"
                    value={it.company || ''}
                    onChange={(v) => updateItem(idx, { company: v })}
                    placeholder="Freelance / Client"
                  />
                </div>
                <div className="col-md-6">
                  <TextInput
                    label="Location"
                    value={it.location || ''}
                    onChange={(v) => updateItem(idx, { location: v })}
                    placeholder="Remote"
                  />
                </div>
                <div className="col-md-3">
                  <TextInput
                    label="Start"
                    value={it.start || ''}
                    onChange={(v) => updateItem(idx, { start: v })}
                    placeholder="2017"
                  />
                </div>
                <div className="col-md-3">
                  <TextInput
                    label="End"
                    value={it.end || ''}
                    onChange={(v) => updateItem(idx, { end: v })}
                    placeholder="Present"
                  />
                </div>
                <div className="col-md-12">
                  <TextArea
                    label="Description"
                    value={it.description || ''}
                    onChange={(v) => updateItem(idx, { description: v })}
                    rows={4}
                  />
                </div>
                <div className="col-md-6">
                  <TextInput
                    label="Link (optional)"
                    value={it.href || ''}
                    onChange={(v) => updateItem(idx, { href: v })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-md-6">
                  <TextInput
                    label="Icon Class"
                    value={it.icon || ''}
                    onChange={(v) => updateItem(idx, { icon: v })}
                    placeholder="fa-solid fa-briefcase"
                  />
                </div>
              </div>

              <TagInput
                label="Tags"
                value={Array.isArray(it.tags) ? it.tags : []}
                onChange={(tags) => updateItem(idx, { tags })}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary mt-3" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Experience'}
      </button>
    </AdminCard>
  );
}
