'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import AdminTable from '@/components/admin/AdminTable';
import AdminModal from '@/components/admin/AdminModal';

import { formatDateTime } from '@/lib/format';
import { slugify } from '@/lib/slug';

export default function BlogsList({ rows, setRows, onReload }) {
  const router = useRouter();

  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [confirm, setConfirm] = useState({ open: false, row: null });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows || [];

    return (rows || []).filter((r) => {
      const s = `${r.title || ''} ${r.slug || ''} ${r.excerpt || ''}`.toLowerCase();
      return s.includes(needle);
    });
  }, [rows, q]);

  const updateLocal = (id, patch) => {
    setRows((prev) => (prev || []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const createDraft = async () => {
    setBusyId('new');

    const now = Date.now();
    const title = 'New Post';
    const slug = `new-post-${now}`;

    const payload = {
      title,
      slug,
      excerpt: '',
      is_enabled: true,
      is_published: false,
      published_at: null,
      sort_order: (rows?.[rows.length - 1]?.sort_order || 0) + 10,
    };

    const { data, error } = await supabase.from('blog_posts').insert(payload).select('*').single();

    setBusyId(null);

    if (error) {
      alert(error.message);
      return;
    }

    setRows((prev) => [data, ...(prev || [])]);

    // route to edit page (we’ll build it next)
    router.push(`/admin/blogs/${data.id}/edit`);
  };

  const saveRow = async (r) => {
    setBusyId(r.id);

    const clean = {
      title: r.title || '',
      slug: r.slug || slugify(r.title || ''),
      excerpt: r.excerpt || null,
      is_enabled: !!r.is_enabled,
      is_published: !!r.is_published,
      published_at: r.is_published ? (r.published_at || new Date().toISOString()) : null,
      sort_order: Number.isFinite(r.sort_order) ? r.sort_order : 0,
    };

    const { data, error } = await supabase.from('blog_posts').update(clean).eq('id', r.id).select('*').single();

    setBusyId(null);

    if (error) {
      alert(error.message);
      return;
    }

    setRows((prev) => (prev || []).map((x) => (x.id === r.id ? data : x)));
  };

  const toggleEnabled = async (r) => {
    updateLocal(r.id, { is_enabled: !r.is_enabled });
    await saveRow({ ...r, is_enabled: !r.is_enabled });
  };

  const togglePublished = async (r) => {
    const next = !r.is_published;
    updateLocal(r.id, {
      is_published: next,
      published_at: next ? (r.published_at || new Date().toISOString()) : null,
    });
    await saveRow({
      ...r,
      is_published: next,
      published_at: next ? (r.published_at || new Date().toISOString()) : null,
    });
  };

  const confirmDelete = (r) => setConfirm({ open: true, row: r });

  const deleteRow = async () => {
    const r = confirm.row;
    if (!r) return;

    setBusyId(r.id);

    const { error } = await supabase.from('blog_posts').delete().eq('id', r.id);

    setBusyId(null);
    setConfirm({ open: false, row: null });

    if (error) {
      alert(error.message);
      return;
    }

    setRows((prev) => (prev || []).filter((x) => x.id !== r.id));
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (r) => (
        <div className="d-flex flex-column">
          <div className="fw-semibold">{r.title || 'Untitled'}</div>
          <div className="small opacity-75">
            <span className="me-2">Slug:</span>
            <code>{r.slug}</code>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="d-flex flex-wrap gap-2">
          {r.is_published ? <span className="badge text-bg-success">Published</span> : <span className="badge text-bg-secondary">Draft</span>}
          {!r.is_enabled ? <span className="badge text-bg-dark">Disabled</span> : <span className="badge text-bg-light text-dark">Enabled</span>}
        </div>
      ),
    },
    {
      key: 'published_at',
      header: 'Published',
      render: (r) => <span className="small">{r.published_at ? formatDateTime(r.published_at) : '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => router.push(`/admin/blogs/${r.id}/edit`)}
          >
            Edit
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => toggleEnabled(r)}
            disabled={busyId === r.id}
            title="Toggle enabled"
          >
            {r.is_enabled ? 'Disable' : 'Enable'}
          </button>

          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={() => togglePublished(r)}
            disabled={busyId === r.id}
            title="Toggle published"
          >
            {r.is_published ? 'Unpublish' : 'Publish'}
          </button>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => confirmDelete(r)}
            disabled={busyId === r.id}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-light" onClick={createDraft} disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Creating...' : '+ New Post'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onReload}>
            Reload
          </button>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <input
            className="form-control"
            style={{ minWidth: 260 }}
            placeholder="Search title/slug..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <AdminTable columns={columns} rows={filtered} emptyText="No blog posts found." />

      <AdminModal
        open={confirm.open}
        title="Delete blog post?"
        onClose={() => setConfirm({ open: false, row: null })}
        footer={
          <>
            <button className="btn btn-outline-light" onClick={() => setConfirm({ open: false, row: null })}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={deleteRow} disabled={busyId === confirm.row?.id}>
              {busyId === confirm.row?.id ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <div className="mb-2">
          This will permanently delete <strong>{confirm.row?.title}</strong> and all its blocks (via cascade).
        </div>
        <div className="small opacity-75">This cannot be undone.</div>
      </AdminModal>
    </>
  );
}
