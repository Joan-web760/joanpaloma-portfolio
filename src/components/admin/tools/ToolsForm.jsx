'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';

import TextInput from '@/components/admin/forms/TextInput';
import Toggle from '@/components/admin/forms/Toggle';
import Repeater from '@/components/admin/forms/Repeater';

export default function ToolsForm({ settings, groups, items, onSave, saving, onReload }) {
  const [sDraft, setSDraft] = useState({ title: '', subtitle: '', is_enabled: true });
  const [gDraft, setGDraft] = useState([]);
  const [iDraft, setIDraft] = useState([]);

  useEffect(() => {
    setSDraft({
      title: settings?.title || 'Tools & Skills',
      subtitle: settings?.subtitle || '',
      is_enabled: settings?.is_enabled ?? true,
    });

    setGDraft(Array.isArray(groups) ? groups : []);
    setIDraft(Array.isArray(items) ? items : []);
  }, [settings, groups, items]);

  const groupedItems = useMemo(() => {
    const map = {};
    (gDraft || []).forEach((g) => {
      map[g.id] = (iDraft || []).filter((it) => it.group_id === g.id);
    });
    return map;
  }, [gDraft, iDraft]);

  const addGroup = () => {
    setGDraft((p) => [
      ...(p || []),
      {
        id: crypto.randomUUID(),
        title: 'New Group',
        is_enabled: true,
        sort_order: ((p || []).slice(-1)[0]?.sort_order || 0) + 10,
      },
    ]);
  };

  const updateGroup = (id, patch) => {
    setGDraft((p) => (p || []).map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const removeGroup = (id) => {
    if (!confirm('Remove this group? Items under it will also be removed (local).')) return;
    setGDraft((p) => (p || []).filter((g) => g.id !== id));
    setIDraft((p) => (p || []).filter((it) => it.group_id !== id));
  };

  const updateItemsForGroup = (groupId, nextItems) => {
    setIDraft((prev) => {
      const keep = (prev || []).filter((it) => it.group_id !== groupId);
      const normalized = (nextItems || []).map((it, idx) => ({
        id: it.id || crypto.randomUUID(),
        group_id: groupId,
        is_enabled: it.is_enabled ?? true,
        label: it.label || '',
        level: it.level || null,
        icon_class: it.icon_class || null,
        sort_order: Number.isFinite(it.sort_order) ? it.sort_order : (idx + 1) * 10,
      }));
      return [...keep, ...normalized];
    });
  };

  const save = () => {
    // Only save the current draft; server will enforce RLS
    onSave?.({
      settingsPatch: {
        title: sDraft.title,
        subtitle: sDraft.subtitle || null,
        is_enabled: !!sDraft.is_enabled,
      },
      groupsPatch: (gDraft || []).map((g, idx) => ({
        id: g.id,
        title: g.title || '',
        is_enabled: g.is_enabled ?? true,
        sort_order: Number.isFinite(g.sort_order) ? g.sort_order : (idx + 1) * 10,
      })),
      itemsPatch: (iDraft || []).map((it, idx) => ({
        id: it.id,
        group_id: it.group_id,
        is_enabled: it.is_enabled ?? true,
        label: it.label || '',
        level: it.level || null,
        icon_class: it.icon_class || null,
        sort_order: Number.isFinite(it.sort_order) ? it.sort_order : (idx + 1) * 10,
      })),
    });
  };

  return (
    <div className="d-flex flex-column gap-3">
      <AdminCard title="Page Settings">
        <div className="row g-2">
          <div className="col-md-6">
            <TextInput label="Title" value={sDraft.title} onChange={(v) => setSDraft((p) => ({ ...p, title: v }))} />
          </div>
          <div className="col-md-6">
            <TextInput
              label="Subtitle"
              value={sDraft.subtitle}
              onChange={(v) => setSDraft((p) => ({ ...p, subtitle: v }))}
            />
          </div>
        </div>

        <Toggle
          label="Enabled"
          checked={!!sDraft.is_enabled}
          onChange={(v) => setSDraft((p) => ({ ...p, is_enabled: v }))}
          hint="Disable to hide the Tools page publicly."
        />
      </AdminCard>

      <AdminCard title="Groups & Items">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div className="small opacity-75">Manage groups first, then add items inside each group.</div>
          <button type="button" className="btn btn-outline-light btn-sm" onClick={addGroup}>
            + Add Group
          </button>
        </div>

        <div className="d-flex flex-column gap-2">
          {(gDraft || []).map((g) => (
            <div key={g.id} className="card bg-black border border-secondary">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                  <div className="fw-semibold">{g.title || 'Untitled Group'}</div>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeGroup(g.id)}>
                    Remove
                  </button>
                </div>

                <div className="row g-2">
                  <div className="col-md-6">
                    <TextInput
                      label="Group Title"
                      value={g.title || ''}
                      onChange={(v) => updateGroup(g.id, { title: v })}
                    />
                  </div>
                  <div className="col-md-3">
                    <TextInput
                      label="Sort Order"
                      value={String(g.sort_order ?? 0)}
                      onChange={(v) => updateGroup(g.id, { sort_order: parseInt(v || '0', 10) })}
                    />
                  </div>
                  <div className="col-md-3">
                    <Toggle
                      label="Enabled"
                      checked={!!g.is_enabled}
                      onChange={(v) => updateGroup(g.id, { is_enabled: v })}
                    />
                  </div>
                </div>

                <hr className="border-secondary" />

                <Repeater
                  label="Items"
                  value={(groupedItems[g.id] || []).map((it) => ({
                    id: it.id,
                    label: it.label,
                    level: it.level || '',
                    icon_class: it.icon_class || '',
                    is_enabled: it.is_enabled ?? true,
                    sort_order: it.sort_order ?? 0,
                  }))}
                  onChange={(next) => updateItemsForGroup(g.id, next)}
                  itemLabel="Tool"
                  fields={[
                    { key: 'label', label: 'Label', placeholder: 'Next.js' },
                    { key: 'level', label: 'Level', placeholder: 'Advanced' },
                    { key: 'icon_class', label: 'Icon Class', placeholder: 'fa-brands fa-react' },
                    { key: 'sort_order', label: 'Sort', placeholder: '10' },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex gap-2 flex-wrap mt-2">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onReload} disabled={saving}>
            Reload
          </button>
        </div>
      </AdminCard>
    </div>
  );
}
