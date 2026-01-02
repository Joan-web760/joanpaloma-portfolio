'use client';

import { useMemo, useState } from 'react';
import AdminCard from '@/components/admin/AdminCard';

import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Select from '@/components/admin/forms/Select';
import Repeater from '@/components/admin/forms/Repeater';
import ImageUpload from '@/components/admin/forms/ImageUpload';
import Toggle from '@/components/admin/forms/Toggle';

import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/slug';

const CATEGORY_OPTIONS = [
  { label: 'Select category', value: '' },
  { label: 'Web App', value: 'webapp' },
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Landing Page', value: 'landing' },
  { label: 'API / Backend', value: 'api' },
  { label: 'Ecommerce', value: 'ecommerce' },
  { label: 'Other', value: 'other' },
];

export default function PortfolioForm({ items, setItems, onReload }) {
  const [expandedId, setExpandedId] = useState(items?.[0]?.id || null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const sortedItems = useMemo(() => items || [], [items]);

  const updateLocal = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const move = (id, dir) => {
    setItems((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) return prev;

      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;

      const a = arr[idx];
      const b = arr[to];

      // swap sort_order values (and positions)
      const tmp = a.sort_order;
      a.sort_order = b.sort_order;
      b.sort_order = tmp;

      arr[idx] = b;
      arr[to] = a;

      return arr;
    });
  };

  const createItem = async () => {
    setMsg({ type: '', text: '' });
    setBusyId('new');

    const payload = {
      title: 'New Portfolio Item',
      slug: `new-portfolio-item-${Date.now()}`,
      is_enabled: true,
      is_featured: false,
      category: '',
      badge: '',
      excerpt: '',
      description: '',
      tech_stack: [],
      links: { live: '', repo: '', case_study: '' },
      cover_image_url: null,
      cover_image_bucket: null,
      cover_image_path: null,
      gallery: [],
      sort_order: (sortedItems?.[sortedItems.length - 1]?.sort_order || 0) + 10,
    };

    const { data, error } = await supabase
      .from('portfolio_items')
      .insert(payload)
      .select('*')
      .single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => [data, ...(prev || [])]);
    setExpandedId(data.id);
    setMsg({ type: 'success', text: 'Created.' });
  };

  const saveItem = async (item) => {
    setMsg({ type: '', text: '' });
    setBusyId(item.id);

    const clean = {
      is_enabled: !!item.is_enabled,
      is_featured: !!item.is_featured,
      title: item.title || '',
      slug: item.slug || slugify(item.title || ''),
      badge: item.badge || null,
      category: item.category || null,
      excerpt: item.excerpt || null,
      description: item.description || null,
      tech_stack: Array.isArray(item.tech_stack) ? item.tech_stack : [],
      links: item.links && typeof item.links === 'object' ? item.links : {},
      cover_image_url: item.cover_image_url || null,
      cover_image_bucket: item.cover_image_bucket || null,
      cover_image_path: item.cover_image_path || null,
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
      sort_order: Number.isFinite(item.sort_order) ? item.sort_order : 0,
    };

    const { data, error } = await supabase
      .from('portfolio_items')
      .update(clean)
      .eq('id', item.id)
      .select('*')
      .single();

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => prev.map((x) => (x.id === item.id ? data : x)));
    setMsg({ type: 'success', text: 'Saved.' });
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;

    setMsg({ type: '', text: '' });
    setBusyId(item.id);

    const { error } = await supabase.from('portfolio_items').delete().eq('id', item.id);

    setBusyId(null);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== item.id));
    setMsg({ type: 'success', text: 'Deleted.' });
    if (expandedId === item.id) setExpandedId(null);
  };

  const normalizeLinks = (links) => {
    const l = links && typeof links === 'object' ? links : {};
    return {
      live: l.live || '',
      repo: l.repo || '',
      case_study: l.case_study || '',
    };
  };

  const setLink = (item, key, value) => {
    updateLocal(item.id, { links: { ...normalizeLinks(item.links), [key]: value } });
  };

  const addGalleryImage = (item, imgRef) => {
    const next = Array.isArray(item.gallery) ? [...item.gallery] : [];
    next.push({
      bucket: imgRef.bucket,
      path: imgRef.path,
      url: null,
      alt: '',
      caption: '',
    });
    updateLocal(item.id, { gallery: next });
  };

  const updateGallery = (item, idx, patch) => {
    const next = Array.isArray(item.gallery) ? [...item.gallery] : [];
    next[idx] = { ...(next[idx] || {}), ...patch };
    updateLocal(item.id, { gallery: next });
  };

  const removeGallery = (item, idx) => {
    const next = Array.isArray(item.gallery) ? item.gallery.filter((_, i) => i !== idx) : [];
    updateLocal(item.id, { gallery: next });
  };

  return (
    <div className="d-flex flex-column gap-3">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <div className="d-flex gap-2 flex-wrap">
        <button className="btn btn-outline-light" onClick={createItem} disabled={busyId === 'new'}>
          {busyId === 'new' ? 'Creating...' : '+ Add Portfolio Item'}
        </button>

        <button className="btn btn-outline-secondary" onClick={onReload}>
          Reload
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center opacity-75 py-5">No portfolio items yet.</div>
      ) : null}

      <div className="d-flex flex-column gap-2">
        {sortedItems.map((it, index) => {
          const open = expandedId === it.id;
          const links = normalizeLinks(it.links);

          return (
            <AdminCard key={it.id} title={it.title || 'Untitled'}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="small opacity-75">
                  <span className="me-2">Slug:</span>
                  <code>{it.slug}</code>
                  {it.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
                  {!it.is_enabled ? <span className="badge text-bg-secondary ms-2">Disabled</span> : null}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setExpandedId(open ? null : it.id)}
                  >
                    {open ? 'Collapse' : 'Edit'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => move(it.id, -1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <i className="fa-solid fa-arrow-up" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={() => move(it.id, 1)}
                    disabled={index === sortedItems.length - 1}
                    title="Move down"
                  >
                    <i className="fa-solid fa-arrow-down" />
                  </button>
                </div>
              </div>

              {open ? (
                <div className="mt-3">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <TextInput
                        label="Title"
                        value={it.title || ''}
                        onChange={(v) => {
                          updateLocal(it.id, { title: v });
                          if (!it.slug || it.slug.startsWith('new-portfolio-item-')) {
                            updateLocal(it.id, { slug: slugify(v || '') });
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <TextInput
                        label="Slug"
                        value={it.slug || ''}
                        onChange={(v) => updateLocal(it.id, { slug: slugify(v || '') })}
                        placeholder="auto-generated"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <Select
                        label="Category"
                        value={it.category || ''}
                        onChange={(v) => updateLocal(it.id, { category: v })}
                        options={CATEGORY_OPTIONS}
                      />
                    </div>

                    <div className="col-md-6">
                      <TextInput
                        label="Badge (optional)"
                        value={it.badge || ''}
                        onChange={(v) => updateLocal(it.id, { badge: v })}
                        placeholder="Case Study"
                      />
                    </div>
                  </div>

                  <Toggle
                    label="Enabled"
                    checked={!!it.is_enabled}
                    onChange={(v) => updateLocal(it.id, { is_enabled: v })}
                    hint="Disabled items are hidden from public."
                  />

                  <Toggle
                    label="Featured"
                    checked={!!it.is_featured}
                    onChange={(v) => updateLocal(it.id, { is_featured: v })}
                    hint="Use for homepage/featured sections."
                  />

                  <TextArea
                    label="Excerpt (optional)"
                    value={it.excerpt || ''}
                    onChange={(v) => updateLocal(it.id, { excerpt: v })}
                    rows={3}
                  />

                  <TextArea
                    label="Description (optional)"
                    value={it.description || ''}
                    onChange={(v) => updateLocal(it.id, { description: v })}
                    rows={6}
                  />

                  <hr className="border-secondary" />

                  <div className="fw-semibold mb-2">Links</div>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <TextInput
                        label="Live URL"
                        value={links.live}
                        onChange={(v) => setLink(it, 'live', v)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="col-md-4">
                      <TextInput
                        label="Repo URL"
                        value={links.repo}
                        onChange={(v) => setLink(it, 'repo', v)}
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="col-md-4">
                      <TextInput
                        label="Case Study URL"
                        value={links.case_study}
                        onChange={(v) => setLink(it, 'case_study', v)}
                        placeholder="/blog/..."
                      />
                    </div>
                  </div>

                  <hr className="border-secondary" />

                  <div className="fw-semibold mb-2">Tech Stack</div>
                  <Repeater
                    label="Tech Stack Tags"
                    value={Array.isArray(it.tech_stack) ? it.tech_stack : []}
                    onChange={(v) => updateLocal(it.id, { tech_stack: v })}
                    itemLabel="Tech"
                  />

                  <hr className="border-secondary" />

                  <div className="fw-semibold mb-2">Cover Image</div>
                  <TextInput
                    label="Cover Image URL (optional)"
                    value={it.cover_image_url || ''}
                    onChange={(v) =>
                      updateLocal(it.id, {
                        cover_image_url: v,
                        cover_image_bucket: null,
                        cover_image_path: null,
                      })
                    }
                    placeholder="https://..."
                  />

                  <ImageUpload
                    label="Upload Cover Image (optional)"
                    bucket="site"
                    folder="portfolio"
                    value={
                      it.cover_image_bucket && it.cover_image_path
                        ? { bucket: it.cover_image_bucket, path: it.cover_image_path }
                        : null
                    }
                    onChange={({ bucket, path }) =>
                      updateLocal(it.id, {
                        cover_image_bucket: bucket,
                        cover_image_path: path,
                        cover_image_url: '',
                      })
                    }
                  />

                  <hr className="border-secondary" />

                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <div className="fw-semibold">Gallery</div>
                    <div className="small opacity-75">Upload adds to gallery list</div>
                  </div>

                  <ImageUpload
                    label="Upload Gallery Image"
                    bucket="site"
                    folder="portfolio"
                    value={null}
                    onChange={(ref) => addGalleryImage(it, ref)}
                  />

                  <div className="d-flex flex-column gap-2">
                    {(Array.isArray(it.gallery) ? it.gallery : []).map((g, idx) => (
                      <div key={`${it.id}-g-${idx}`} className="card bg-black border border-secondary">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="small opacity-75">
                              {g.bucket && g.path ? (
                                <code>{g.bucket}/{g.path}</code>
                              ) : g.url ? (
                                <code>{g.url}</code>
                              ) : (
                                <code>Image #{idx + 1}</code>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeGallery(it, idx)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="row g-2">
                            <div className="col-md-6">
                              <TextInput
                                label="Alt"
                                value={g.alt || ''}
                                onChange={(v) => updateGallery(it, idx, { alt: v })}
                              />
                            </div>
                            <div className="col-md-6">
                              <TextInput
                                label="Caption"
                                value={g.caption || ''}
                                onChange={(v) => updateGallery(it, idx, { caption: v })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <hr className="border-secondary" />

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-primary"
                      onClick={() => saveItem(it)}
                      disabled={busyId === it.id}
                    >
                      {busyId === it.id ? 'Saving...' : 'Save Item'}
                    </button>

                    <button
                      className="btn btn-outline-danger"
                      onClick={() => deleteItem(it)}
                      disabled={busyId === it.id}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
