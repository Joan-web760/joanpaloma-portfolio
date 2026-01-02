'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import BlogEditorForm from '@/components/admin/blogs/BlogEditorForm';

export default function AdminBlogEditPage({ params }) {
  const id = params?.id;

  const [post, setPost] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setMsg({ type: '', text: '' });

    const [pRes, bRes, cRes] = await Promise.all([
      supabase.from('blog_posts').select('*').eq('id', id).single(),
      supabase.from('blog_post_blocks').select('*').eq('post_id', id).order('sort_order', { ascending: true }),
      supabase.from('blog_categories').select('*').order('sort_order', { ascending: true }),
    ]);

    if (pRes.error) setMsg({ type: 'danger', text: pRes.error.message });
    if (bRes.error) setMsg({ type: 'danger', text: bRes.error.message });
    if (cRes.error) setMsg({ type: 'danger', text: cRes.error.message });

    setPost(pRes.data || null);
    setBlocks(bRes.data || []);
    setCategories(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) return <div className="py-5 text-center opacity-75">Loading...</div>;
  if (!post) return <div className="py-5 text-center opacity-75">Post not found.</div>;

  return (
    <div className="d-flex flex-column gap-3">
      <AdminPageHeader title="Edit Blog Post" subtitle={post.title} />
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <BlogEditorForm
        post={post}
        setPost={setPost}
        blocks={blocks}
        setBlocks={setBlocks}
        categories={categories}
      />
    </div>
  );
}
