'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import BlogsList from '@/components/admin/blogs/BlogsList';

export default function AdminBlogsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) setMsg({ type: 'danger', text: error.message });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Blogs" subtitle="Manage blog posts. Create/edit pages come next." />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      {loading ? (
        <div className="py-5 text-center opacity-75">Loading...</div>
      ) : (
        <BlogsList rows={rows} setRows={setRows} onReload={load} />
      )}
    </div>
  );
}
