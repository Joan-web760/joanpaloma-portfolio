'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Toggle from '@/components/admin/forms/Toggle';

/* -------------------- HELPERS -------------------- */

const cleanStr = (v) => (v || '').trim();

const tempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `tmp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

const emptyNavLink = () => ({
  id: tempId(),
  label: '',
  href: '',
  is_enabled: true,
});

const emptySocial = () => ({
  id: tempId(),
  label: '',
  href: '',
  icon_class: 'fa-brands fa-github',
  is_enabled: true,
});

/* -------------------- SORTABLE WRAPPER -------------------- */

function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

/* -------------------- COMPONENT -------------------- */

export default function SettingsForm({ site, setSite, onReload }) {
  const [busy, setBusy] = useState(false);

  // Inline status bar (like your BackgroundSettingsForm "Saved.")
  const [note, setNote] = useState({ type: '', text: '' }); // type: success | danger | info
  const noteTimer = useRef(null);

  const [navLinks, setNavLinks] = useState([]);
  const [socials, setSocials] = useState([]);

  const [openNavId, setOpenNavId] = useState(null);
  const [openSocialId, setOpenSocialId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const showNote = (next, { autoHideMs = 0 } = {}) => {
    setNote(next);
    if (noteTimer.current) clearTimeout(noteTimer.current);

    if (autoHideMs > 0) {
      noteTimer.current = setTimeout(() => {
        setNote({ type: '', text: '' });
      }, autoHideMs);
    }
  };

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  /* -------------------- LOAD -------------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      const [navRes, socialRes] = await Promise.all([
        supabase.from('site_navbar_links').select('*').order('sort_order', { ascending: true }),
        supabase.from('site_footer_social_links').select('*').order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      if (navRes.error) showNote({ type: 'danger', text: navRes.error.message });
      if (socialRes.error) showNote({ type: 'danger', text: socialRes.error.message });

      setNavLinks((navRes.data || []).map((l) => ({ ...l })));
      setSocials((socialRes.data || []).map((s) => ({ ...s })));
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- HELPERS -------------------- */

  const patchById = (setFn, id, patch) => {
    setFn((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeById = (setFn, id) => {
    setFn((prev) => prev.filter((x) => x.id !== id));
  };

  const navCountEnabled = useMemo(() => navLinks.filter((l) => l.is_enabled).length, [navLinks]);
  const socialCountEnabled = useMemo(() => socials.filter((s) => s.is_enabled).length, [socials]);

  /* -------------------- DND EVENTS -------------------- */

  const onNavDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setNavLinks((items) => {
      const oldIndex = items.findIndex((x) => x.id === active.id);
      const newIndex = items.findIndex((x) => x.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const onSocialDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setSocials((items) => {
      const oldIndex = items.findIndex((x) => x.id === active.id);
      const newIndex = items.findIndex((x) => x.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  /* -------------------- SAVE -------------------- */

  const save = async () => {
    setBusy(true);
    showNote({ type: 'info', text: 'Saving…' });

    try {
      const navUpsert = await supabase.from('site_navbar_settings').upsert({
        id: true,
        brand_label: cleanStr(site.brand_label) || 'Your Name',
        brand_href: cleanStr(site.brand_href) || '/',
        cta_enabled: site.cta_enabled ?? true,
        cta_label: cleanStr(site.cta_label) || 'Book a Call',
        cta_href: cleanStr(site.cta_href) || '/contact',
        updated_at: new Date().toISOString(),
      });
      if (navUpsert.error) throw navUpsert.error;

      const footerUpsert = await supabase.from('site_footer_settings').upsert({
        id: true,
        footer_text: cleanStr(site.footer_text) || '© Your Name. All rights reserved.',
        show_social_links: site.show_social_links ?? true,
        updated_at: new Date().toISOString(),
      });
      if (footerUpsert.error) throw footerUpsert.error;

      const navPayload = navLinks
        .map((l) => ({
          label: cleanStr(l.label),
          href: cleanStr(l.href),
          is_enabled: l.is_enabled ?? true,
        }))
        .filter((l) => l.label && l.href);

      const navDel = await supabase
        .from('site_navbar_links')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (navDel.error) throw navDel.error;

      if (navPayload.length) {
        const navIns = await supabase
          .from('site_navbar_links')
          .insert(navPayload.map((l, i) => ({ ...l, sort_order: i + 1 })));
        if (navIns.error) throw navIns.error;
      }

      const socialPayload = socials
        .map((s) => ({
          label: cleanStr(s.label),
          href: cleanStr(s.href),
          icon_class: cleanStr(s.icon_class) || 'fa-brands fa-github',
          is_enabled: s.is_enabled ?? true,
        }))
        .filter((s) => s.label && s.href);

      const socialDel = await supabase
        .from('site_footer_social_links')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (socialDel.error) throw socialDel.error;

      if (socialPayload.length) {
        const socialIns = await supabase
          .from('site_footer_social_links')
          .insert(socialPayload.map((s, i) => ({ ...s, sort_order: i + 1 })));
        if (socialIns.error) throw socialIns.error;
      }

      showNote({ type: 'success', text: 'Saved.' }, { autoHideMs: 3000 });
      onReload?.();
    } catch (e) {
      showNote({ type: 'danger', text: e?.message || 'Save failed.' });
    } finally {
      setBusy(false);
    }
  };

  if (!site) return <div className="opacity-75">Missing site settings row.</div>;

  const noteClass =
    note.type === 'success'
      ? 'bg-success-subtle text-success-emphasis border border-success-subtle'
      : note.type === 'danger'
      ? 'bg-danger-subtle text-danger-emphasis border border-danger-subtle'
      : note.type === 'info'
      ? 'bg-info-subtle text-info-emphasis border border-info-subtle'
      : '';

  return (
    <AdminCard title="Site Settings">
      {/* Inline "Saved." bar like BackgroundSettingsForm */}
      {note.text ? (
        <div className={`rounded px-3 py-2 mb-3 ${noteClass}`}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              {note.type === 'success' ? <i className="fa-solid fa-circle-check" /> : null}
              {note.type === 'danger' ? <i className="fa-solid fa-triangle-exclamation" /> : null}
              {note.type === 'info' ? <i className="fa-solid fa-spinner fa-spin" /> : null}
              <span className="fw-semibold">{note.text}</span>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setNote({ type: '', text: '' })}
              aria-label="Dismiss"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------------- NAVBAR SETTINGS ---------------- */}
      <div className="fw-semibold mb-2">Navbar</div>

      <TextInput
        label="Brand Label"
        value={site.brand_label || ''}
        onChange={(v) => setSite((p) => ({ ...p, brand_label: v }))}
      />
      <TextInput
        label="Brand Href"
        value={site.brand_href || ''}
        onChange={(v) => setSite((p) => ({ ...p, brand_href: v }))}
      />

      <Toggle
        label="CTA Enabled"
        checked={!!site.cta_enabled}
        onChange={(v) => setSite((p) => ({ ...p, cta_enabled: v }))}
      />
      <TextInput
        label="CTA Label"
        value={site.cta_label || ''}
        onChange={(v) => setSite((p) => ({ ...p, cta_label: v }))}
      />
      <TextInput
        label="CTA Href"
        value={site.cta_href || ''}
        onChange={(v) => setSite((p) => ({ ...p, cta_href: v }))}
      />

      {/* ---------------- NAV LINKS (DnD) ---------------- */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="fw-semibold">
          Navbar Links ({navLinks.length} / {navCountEnabled} enabled)
          <span className="small opacity-75 ms-2">Drag using the grip icon</span>
        </div>

        <button
          className="btn btn-outline-light btn-sm"
          type="button"
          onClick={() => {
            const next = emptyNavLink();
            setNavLinks((p) => [...p, next]);
            setOpenNavId(next.id);
          }}
        >
          + Add Link
        </button>
      </div>

      <div className="mt-2 d-flex flex-column gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onNavDragEnd}>
          <SortableContext items={navLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {navLinks.map((l, idx) => {
              const isOpen = openNavId === l.id;
              return (
                <SortableRow key={l.id} id={l.id}>
                  {({ attributes, listeners }) => (
                    <div className="border border-secondary rounded bg-dark">
                      <div className="d-flex align-items-center justify-content-between px-3 py-2">
                        <button
                          type="button"
                          className="bg-transparent border-0 text-light text-start flex-grow-1 d-flex align-items-center gap-2"
                          onClick={() => setOpenNavId((prev) => (prev === l.id ? null : l.id))}
                        >
                          <span className={`badge ${l.is_enabled ? 'text-bg-success' : 'text-bg-secondary'}`}>
                            {l.is_enabled ? 'On' : 'Off'}
                          </span>
                          <strong>{cleanStr(l.label) || `Link ${idx + 1}`}</strong>
                          {cleanStr(l.href) ? (
                            <span className="small opacity-75 d-none d-md-inline">{cleanStr(l.href)}</span>
                          ) : null}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Drag to reorder"
                          {...attributes}
                          {...listeners}
                        >
                          <i className="fa-solid fa-grip-vertical" />
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="px-3 pb-3">
                          <Toggle
                            label="Enabled"
                            checked={!!l.is_enabled}
                            onChange={(v) => patchById(setNavLinks, l.id, { is_enabled: v })}
                          />
                          <TextInput
                            label="Label"
                            value={l.label || ''}
                            onChange={(v) => patchById(setNavLinks, l.id, { label: v })}
                          />
                          <TextInput
                            label="Href"
                            value={l.href || ''}
                            onChange={(v) => patchById(setNavLinks, l.id, { href: v })}
                            placeholder="/services or https://..."
                          />

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mt-2"
                            onClick={() => {
                              removeById(setNavLinks, l.id);
                              setOpenNavId((prev) => (prev === l.id ? null : prev));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </SortableRow>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* ---------------- SOCIAL LINKS (DnD) ---------------- */}
      <hr className="border-secondary my-4" />

      <div className="d-flex justify-content-between align-items-center">
        <div className="fw-semibold">
          Social Links ({socials.length} / {socialCountEnabled} enabled)
          <span className="small opacity-75 ms-2">Drag using the grip icon</span>
        </div>

        <button
          className="btn btn-outline-light btn-sm"
          type="button"
          onClick={() => {
            const next = emptySocial();
            setSocials((p) => [...p, next]);
            setOpenSocialId(next.id);
          }}
        >
          + Add Social
        </button>
      </div>

      <div className="mt-2 d-flex flex-column gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSocialDragEnd}>
          <SortableContext items={socials.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {socials.map((s, idx) => {
              const isOpen = openSocialId === s.id;
              return (
                <SortableRow key={s.id} id={s.id}>
                  {({ attributes, listeners }) => (
                    <div className="border border-secondary rounded bg-dark">
                      <div className="d-flex align-items-center justify-content-between px-3 py-2">
                        <button
                          type="button"
                          className="bg-transparent border-0 text-light text-start flex-grow-1 d-flex align-items-center gap-2"
                          onClick={() => setOpenSocialId((prev) => (prev === s.id ? null : s.id))}
                        >
                          <span className={`badge ${s.is_enabled ? 'text-bg-success' : 'text-bg-secondary'}`}>
                            {s.is_enabled ? 'On' : 'Off'}
                          </span>
                          <i className={cleanStr(s.icon_class) || 'fa-brands fa-github'} />
                          <strong>{cleanStr(s.label) || `Social ${idx + 1}`}</strong>
                          {cleanStr(s.href) ? (
                            <span className="small opacity-75 d-none d-md-inline">{cleanStr(s.href)}</span>
                          ) : null}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Drag to reorder"
                          {...attributes}
                          {...listeners}
                        >
                          <i className="fa-solid fa-grip-vertical" />
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="px-3 pb-3">
                          <Toggle
                            label="Enabled"
                            checked={!!s.is_enabled}
                            onChange={(v) => patchById(setSocials, s.id, { is_enabled: v })}
                          />
                          <TextInput
                            label="Label"
                            value={s.label || ''}
                            onChange={(v) => patchById(setSocials, s.id, { label: v })}
                          />
                          <TextInput
                            label="Href"
                            value={s.href || ''}
                            onChange={(v) => patchById(setSocials, s.id, { href: v })}
                            placeholder="https://..."
                          />
                          <TextInput
                            label="Icon Class"
                            value={s.icon_class || ''}
                            onChange={(v) => patchById(setSocials, s.id, { icon_class: v })}
                            placeholder="fa-brands fa-github"
                          />

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mt-2"
                            onClick={() => {
                              removeById(setSocials, s.id);
                              setOpenSocialId((prev) => (prev === s.id ? null : prev));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </SortableRow>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* ---------------- SAVE ---------------- */}
      <div className="d-flex gap-2 mt-4">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="btn btn-outline-secondary" onClick={onReload} disabled={busy}>
          Reload
        </button>
      </div>
    </AdminCard>
  );
}
