'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import TextArea from '@/components/admin/forms/TextArea';
import Select from '@/components/admin/forms/Select';
import DateInput from '@/components/admin/forms/DateInput';
import ImageUpload from '@/components/admin/forms/ImageUpload';
import Repeater from '@/components/admin/forms/Repeater';
import Toggle from '@/components/admin/forms/Toggle';

import { slugify } from '@/lib/slug';

const BLOCK_TYPES = [
  { label: 'Heading', value: 'heading' },
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'List', value: 'list' },
  { label: 'Image', value: 'image' },
  { label: 'Quote', value: 'quote' },
  { label: 'Code', value: 'code' },
  { label: 'CTA', value: 'cta' },
];

export default function BlogEditorForm({ post, setPost, blocks, setBlocks, categories }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const categoryOptions = useMemo(() => {
    const opts = [{ label: 'No category', value: '' }];
    (categories || []).forEach((c) => opts.push({ label: c.label, value: c.id }));
    return opts;
  }, [categories]);

  const normalizeTags = (t) => (Array.isArray(t) ? t.filter(Boolean) : []);
  const normalizeData = (d) => (d && typeof d === 'object' ? d : {});

  const updateBlockLocal = (id, patch) => {
    setBlocks((prev) => (prev || []).map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const moveBlock = (id, dir) => {
    setBlocks((prev) => {
      const arr = [...(prev || [])];
      const idx = arr.findIndex((x) => x.id === id);
      if (idx < 0) return prev;

      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;

      const a = arr[idx];
      const b = arr[to];

      const tmp = a.sort_order;
      a.sort_order = b.sort_order;
      b.sort_order = tmp;

      arr[idx] = b;
      arr[to] = a;

      return arr;
    });
  };

  const defaultBlockData = (type) => {
    switch (type) {
      case 'heading':
        return { text: 'Heading', level: 2 };
      case 'paragraph':
        return { text: 'Paragraph text...' };
      case 'list':
        return { ordered: false, items: ['Item 1', 'Item 2'] };
      case 'image':
        return { url: '', bucket: '', path: '', alt: '', caption: '' };
      case 'quote':
        return { text: 'Quote...', author: '' };
      case 'code':
        return { language: 'js', code: '// code...' };
      case 'cta':
        return { title: 'CTA title', subtitle: 'CTA subtitle', label: 'Contact', href: '/contact' };
      default:
        return {};
    }
  };

  const addBlock = async (type) => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    const nextSort =
      Math.max(0, ...(blocks || []).map((b) => Number(b.sort_order) || 0)) + 10;

    const payload = {
      post_id: post.id,
      type,
      is_enabled: true,
      sort_order: nextSort,
      data: defaultBlockData(type),
    };

    const { data, error } = await supabase.from('blog_post_blocks').insert(payload).select('*').single();

    setBusy(false);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setBlocks((prev) => [...(prev || []), data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    setMsg({ type: 'success', text: 'Block added.' });
  };

  const deleteBlock = async (b) => {
    if (!confirm(`Delete this block (${b.type})?`)) return;

    setMsg({ type: '', text: '' });
    setBusy(true);

    const { error } = await supabase.from('blog_post_blocks').delete().eq('id', b.id);

    setBusy(false);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setBlocks((prev) => (prev || []).filter((x) => x.id !== b.id));
    setMsg({ type: 'success', text: 'Block deleted.' });
  };

  const savePost = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    const clean = {
      title: post.title || '',
      slug: post.slug ? slugify(post.slug) : slugify(post.title || ''),
      excerpt: post.excerpt || null,

      category_id: post.category_id || null,

      is_enabled: !!post.is_enabled,
      is_published: !!post.is_published,
      published_at: post.is_published ? (post.published_at || new Date().toISOString()) : null,

      cover_image_url: post.cover_image_url || null,
      cover_image_bucket: post.cover_image_bucket || null,
      cover_image_path: post.cover_image_path || null,

      meta_title: post.meta_title || null,
      meta_description: post.meta_description || null,
      canonical_url: post.canonical_url || null,
      reading_time_minutes: post.reading_time_minutes ? parseInt(post.reading_time_minutes, 10) : null,

      tags: normalizeTags(post.tags),
    };

    const { data, error } = await supabase.from('blog_posts').update(clean).eq('id', post.id).select('*').single();

    setBusy(false);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setPost(data);
    setMsg({ type: 'success', text: 'Post saved.' });
  };

  const saveBlock = async (b) => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    const clean = {
      is_enabled: !!b.is_enabled,
      type: b.type,
      sort_order: Number(b.sort_order) || 0,
      data: normalizeData(b.data),
    };

    const { data, error } = await supabase
      .from('blog_post_blocks')
      .update(clean)
      .eq('id', b.id)
      .select('*')
      .single();

    setBusy(false);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setBlocks((prev) => (prev || []).map((x) => (x.id === b.id ? data : x)));
    setMsg({ type: 'success', text: 'Block saved.' });
  };

  // Render per-block editor
  const BlockEditor = ({ b }) => {
    const d = normalizeData(b.data);

    if (b.type === 'heading') {
      return (
        <>
          <TextInput label="Text" value={d.text || ''} onChange={(v) => updateBlockLocal(b.id, { data: { ...d, text: v } })} />
          <TextInput
            label="Level (1-6)"
            value={String(d.level ?? 2)}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, level: parseInt(v || '2', 10) } })}
          />
        </>
      );
    }

    if (b.type === 'paragraph') {
      return (
        <TextArea label="Text" value={d.text || ''} onChange={(v) => updateBlockLocal(b.id, { data: { ...d, text: v } })} rows={6} />
      );
    }

    if (b.type === 'list') {
      return (
        <>
          <Toggle
            label="Ordered list"
            checked={!!d.ordered}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, ordered: v } })}
          />
          <Repeater
            label="Items"
            value={Array.isArray(d.items) ? d.items : []}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, items: v } })}
            itemLabel="Item"
          />
        </>
      );
    }

    if (b.type === 'image') {
      return (
        <>
          <TextInput
            label="External Image URL (optional)"
            value={d.url || ''}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, url: v, bucket: '', path: '' } })}
            placeholder="https://..."
          />

          <ImageUpload
            label="Upload Image (optional)"
            bucket="site"
            folder="blog"
            value={d.bucket && d.path ? { bucket: d.bucket, path: d.path } : null}
            onChange={({ bucket, path }) => updateBlockLocal(b.id, { data: { ...d, bucket, path, url: '' } })}
          />

          <TextInput label="Alt" value={d.alt || ''} onChange={(v) => updateBlockLocal(b.id, { data: { ...d, alt: v } })} />
          <TextInput
            label="Caption"
            value={d.caption || ''}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, caption: v } })}
          />
        </>
      );
    }

    if (b.type === 'quote') {
      return (
        <>
          <TextArea
            label="Quote"
            value={d.text || ''}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, text: v } })}
            rows={4}
          />
          <TextInput
            label="Author"
            value={d.author || ''}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, author: v } })}
          />
        </>
      );
    }

    if (b.type === 'code') {
      return (
        <>
          <TextInput
            label="Language"
            value={d.language || 'js'}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, language: v } })}
            placeholder="js"
          />
          <TextArea
            label="Code"
            value={d.code || ''}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, code: v } })}
            rows={10}
          />
        </>
      );
    }

    if (b.type === 'cta') {
      return (
        <>
          <TextInput label="Title" value={d.title || ''} onChange={(v) => updateBlockLocal(b.id, { data: { ...d, title: v } })} />
          <TextInput
            label="Subtitle"
            value={d.subtitle || ''}
            onChange={(v) => updateBlockLocal(b.id, { data: { ...d, subtitle: v } })}
          />
          <div className="row g-2">
            <div className="col-md-6">
              <TextInput
                label="Button Label"
                value={d.label || ''}
                onChange={(v) => updateBlockLocal(b.id, { data: { ...d, label: v } })}
              />
            </div>
            <div className="col-md-6">
              <TextInput
                label="Button Href"
                value={d.href || ''}
                onChange={(v) => updateBlockLocal(b.id, { data: { ...d, href: v } })}
              />
            </div>
          </div>
        </>
      );
    }

    return <div className="opacity-75">Unsupported block type.</div>;
  };

  return (
    <div className="d-flex flex-column gap-3">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <AdminCard title="Post Metadata">
        <div className="row g-2">
          <div className="col-md-6">
            <TextInput
              label="Title"
              value={post.title || ''}
              onChange={(v) => setPost((p) => ({ ...p, title: v }))}
            />
          </div>
          <div className="col-md-6">
            <TextInput
              label="Slug"
              value={post.slug || ''}
              onChange={(v) => setPost((p) => ({ ...p, slug: slugify(v || '') }))}
            />
          </div>
        </div>

        <div className="row g-2">
          <div className="col-md-6">
            <Select
              label="Category"
              value={post.category_id || ''}
              onChange={(v) => setPost((p) => ({ ...p, category_id: v || null }))}
              options={categoryOptions}
            />
          </div>
          <div className="col-md-6">
            <TextInput
              label="Reading Time (minutes)"
              value={post.reading_time_minutes ?? ''}
              onChange={(v) => setPost((p) => ({ ...p, reading_time_minutes: v }))}
              placeholder="5"
            />
          </div>
        </div>

        <TextArea
          label="Excerpt"
          value={post.excerpt || ''}
          onChange={(v) => setPost((p) => ({ ...p, excerpt: v }))}
          rows={3}
        />

        <Repeater
          label="Tags"
          value={normalizeTags(post.tags)}
          onChange={(v) => setPost((p) => ({ ...p, tags: v }))}
          itemLabel="Tag"
        />

        <hr className="border-secondary" />

        <div className="fw-semibold mb-2">Cover Image</div>
        <TextInput
          label="Cover Image URL (optional)"
          value={post.cover_image_url || ''}
          onChange={(v) =>
            setPost((p) => ({
              ...p,
              cover_image_url: v,
              cover_image_bucket: null,
              cover_image_path: null,
            }))
          }
          placeholder="https://..."
        />

        <ImageUpload
          label="Upload Cover Image (optional)"
          bucket="site"
          folder="blog"
          value={
            post.cover_image_bucket && post.cover_image_path
              ? { bucket: post.cover_image_bucket, path: post.cover_image_path }
              : null
          }
          onChange={({ bucket, path }) =>
            setPost((p) => ({
              ...p,
              cover_image_bucket: bucket,
              cover_image_path: path,
              cover_image_url: '',
            }))
          }
        />

        <hr className="border-secondary" />

        <div className="row g-2">
          <div className="col-md-6">
            <Toggle
              label="Enabled"
              checked={!!post.is_enabled}
              onChange={(v) => setPost((p) => ({ ...p, is_enabled: v }))}
              hint="Disabled posts are hidden from public."
            />
          </div>
          <div className="col-md-6">
            <Toggle
              label="Published"
              checked={!!post.is_published}
              onChange={(v) =>
                setPost((p) => ({
                  ...p,
                  is_published: v,
                  published_at: v ? (p.published_at || new Date().toISOString()) : null,
                }))
              }
              hint="Published posts appear publicly."
            />
          </div>
        </div>

        <DateInput
          label="Published Date"
          value={post.published_at || ''}
          onChange={(iso) => setPost((p) => ({ ...p, published_at: iso }))}
        />

        <button className="btn btn-primary" onClick={savePost} disabled={busy}>
          {busy ? 'Saving...' : 'Save Post'}
        </button>
      </AdminCard>

      <AdminCard title="SEO (optional)">
        <TextInput
          label="Meta Title"
          value={post.meta_title || ''}
          onChange={(v) => setPost((p) => ({ ...p, meta_title: v }))}
        />
        <TextArea
          label="Meta Description"
          value={post.meta_description || ''}
          onChange={(v) => setPost((p) => ({ ...p, meta_description: v }))}
          rows={3}
        />
        <TextInput
          label="Canonical URL"
          value={post.canonical_url || ''}
          onChange={(v) => setPost((p) => ({ ...p, canonical_url: v }))}
          placeholder="https://yourdomain.com/blog/..."
        />
      </AdminCard>

      <AdminCard title="Content Blocks">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {BLOCK_TYPES.map((t) => (
            <button key={t.value} className="btn btn-outline-light btn-sm" onClick={() => addBlock(t.value)} disabled={busy}>
              + {t.label}
            </button>
          ))}
        </div>

        {(blocks || []).length === 0 ? <div className="opacity-75">No blocks yet. Add one above.</div> : null}

        <div className="d-flex flex-column gap-2">
          {(blocks || [])
            .slice()
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((b, idx) => (
              <div key={b.id} className="card bg-black border border-secondary">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <div className="small opacity-75">
                      <span className="me-2">Type:</span>
                      <code>{b.type}</code>
                      {!b.is_enabled ? <span className="badge text-bg-secondary ms-2">Disabled</span> : null}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => moveBlock(b.id, -1)}
                        disabled={idx === 0}
                        title="Move up"
                      >
                        <i className="fa-solid fa-arrow-up" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-light btn-sm"
                        onClick={() => moveBlock(b.id, 1)}
                        disabled={idx === (blocks || []).length - 1}
                        title="Move down"
                      >
                        <i className="fa-solid fa-arrow-down" />
                      </button>

                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => deleteBlock(b)} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <Toggle
                    label="Enabled"
                    checked={!!b.is_enabled}
                    onChange={(v) => updateBlockLocal(b.id, { is_enabled: v })}
                  />

                  <BlockEditor b={b} />

                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-primary" onClick={() => saveBlock(b)} disabled={busy}>
                      {busy ? 'Saving...' : 'Save Block'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </AdminCard>
    </div>
  );
}
