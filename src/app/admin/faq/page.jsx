'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Toggle from '@/components/admin/forms/Toggle';

/**
 * Expected tables:
 * - faq_page_settings: single row (id=true) with optional fields: title, subtitle, is_enabled
 * - faq_items: id (pk), question, answer, sort_order (int), is_active (bool)
 */
export default function FAQForm({ settings, setSettings, items, setItems, onReload }) {
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [localMsg, setLocalMsg] = useState({ type: '', text: '' });

  const safeSettings = settings || { id: true, title: 'FAQ', subtitle: '', is_enabled: true };

  const normalizedItems = useMemo(() => {
    return (items || []).map((it, idx) => ({
      id: it.id ?? `tmp_${idx}`,
      question: it.question ?? '',
      answer: it.answer ?? '',
      sort_order: Number.isFinite(it.sort_order) ? it.sort_order : idx + 1,
      is_active: typeof it.is_active === 'boolean' ? it.is_active : true,
      __isNew: !it.id,
    }));
  }, [items]);

  const setItemField = (id, key, value) => {
    setItems((prev) =>
      (prev || []).map((it) => (it.id === id ? { ...it, [key]: value } : it))
    );
  };

  const addItem = () => {
    const nextOrder =
      (items || []).reduce((max, it) => Math.max(max, Number(it.sort_order) || 0), 0) + 1;

    setItems((prev) => [
      ...(prev || []),
      {
        id: crypto?.randomUUID ? crypto.randomUUID() : `new_${Date.now()}`,
        question: '',
        answer: '',
        sort_order: nextOrder,
        is_active: true,
        __isNew: true,
      },
    ]);
  };

  const moveItem = (index, dir) => {
    setItems((prev) => {
      const arr = [...(prev || [])];
      const to = index + dir;
      if (to < 0 || to >= arr.length) return arr;

      const tmp = arr[index];
      arr[index] = arr[to];
      arr[to] = tmp;

      // normalize sort_order
      return arr.map((it, i) => ({ ...it, sort_order: i + 1 }));
    });
  };

  const removeItem = async (item) => {
    setLocalMsg({ type: '', text: '' });

    // If it's new (not saved), just remove locally
    if (item.__isNew) {
      setItems((prev) => (prev || []).filter((x) => x.id !== item.id));
      return;
    }

    const { error } = await supabase.from('faq_items').delete().eq('id', item.id);
    if (error) {
      setLocalMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => (prev || []).filter((x) => x.id !== item.id));
    setLocalMsg({ type: 'success', text: 'Item deleted.' });
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setLocalMsg({ type: '', text: '' });

    // Upsert to keep single-row config
    const payload = {
      ...safeSettings,
      id: true,
    };

    const { error } = await supabase.from('faq_page_settings').upsert(payload).eq('id', true);
    if (error) {
      setSavingSettings(false);
      setLocalMsg({ type: 'danger', text: error.message });
      return;
    }

    setSavingSettings(false);
    setLocalMsg({ type: 'success', text: 'Settings saved.' });
    onReload?.();
  };

  const saveItems = async () => {
    setSavingItems(true);
    setLocalMsg({ type: '', text: '' });

    // Normalize sort_order before save
    const ordered = [...normalizedItems].sort((a, b) => a.sort_order - b.sort_order);
    const payload = ordered.map((it, idx) => ({
      id: it.__isNew ? undefined : it.id,
      question: it.question?.trim() || '',
      answer: it.answer?.trim() || '',
      sort_order: idx + 1,
      is_active: !!it.is_active,
    }));

    // Validate
    const bad = payload.find((x) => !x.question || !x.answer);
    if (bad) {
      setSavingItems(false);
      setLocalMsg({ type: 'danger', text: 'Please fill in question and answer for all items.' });
      return;
    }

    // Upsert items
    const { error } = await supabase.from('faq_items').upsert(payload);
    if (error) {
      setSavingItems(false);
      setLocalMsg({ type: 'danger', text: error.message });
      return;
    }

    setSavingItems(false);
    setLocalMsg({ type: 'success', text: 'FAQ items saved.' });
    onReload?.();
  };

  return (
    <div className="d-flex flex-column gap-3">
      {localMsg.text ? <div className={`alert alert-${localMsg.type}`}>{localMsg.text}</div> : null}

      {/* Settings */}
      <AdminCard title="FAQ Page Settings">
        <div className="d-flex flex-column gap-3">
          <TextInput
            label="Title"
            value={safeSettings.title || ''}
            onChange={(v) => setSettings((p) => ({ ...(p || { id: true }), title: v }))}
            placeholder="FAQ"
          />

          <TextArea
            label="Subtitle"
            value={safeSettings.subtitle || ''}
            onChange={(v) => setSettings((p) => ({ ...(p || { id: true }), subtitle: v }))}
            placeholder="Short description shown under the title"
          />

          <Toggle
            label="Enabled"
            checked={!!safeSettings.is_enabled}
            onChange={(v) => setSettings((p) => ({ ...(p || { id: true }), is_enabled: v }))}
          />

          <button className="btn btn-primary" onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </AdminCard>

      {/* Items */}
      <AdminCard title="FAQ Items">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="small opacity-75">Add, edit, enable/disable, and reorder questions.</div>
          <button className="btn btn-outline-light btn-sm" onClick={addItem}>
            <i className="fa-solid fa-plus me-2" />
            Add item
          </button>
        </div>

        <div className="d-flex flex-column gap-3">
          {normalizedItems.length === 0 ? (
            <div className="opacity-75">No FAQ items yet.</div>
          ) : null}

          {normalizedItems.map((it, idx) => (
            <div key={it.id} className="border border-secondary rounded p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-semibold">Item #{idx + 1}</div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    <i className="fa-solid fa-arrow-up" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === normalizedItems.length - 1}
                    title="Move down"
                  >
                    <i className="fa-solid fa-arrow-down" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeItem(it)}
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>

              <div className="d-flex flex-column gap-3">
                <TextInput
                  label="Question"
                  value={it.question}
                  onChange={(v) => setItemField(it.id, 'question', v)}
                  placeholder="Enter question"
                />

                <TextArea
                  label="Answer"
                  value={it.answer}
                  onChange={(v) => setItemField(it.id, 'answer', v)}
                  placeholder="Enter answer"
                />

                <Toggle
                  label="Active"
                  checked={!!it.is_active}
                  onChange={(v) => setItemField(it.id, 'is_active', v)}
                />
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary mt-3" onClick={saveItems} disabled={savingItems}>
          {savingItems ? 'Saving...' : 'Save FAQ Items'}
        </button>
      </AdminCard>
    </div>
  );
}
