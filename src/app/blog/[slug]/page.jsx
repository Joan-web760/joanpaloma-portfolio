'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import BlogPostSection from '@/components/blog/BlogPostSection';
import BlogMeta from '@/components/blog/BlogMeta';
import ContentBlocks from '@/components/blog/ContentBlocks';

export default function BlogPostPage({ params }) {
  const slug = params?.slug;

  const [post, setPost] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    let alive = true;

    const load = async () => {
      setLoading(true);

      const { data: postData, error: postErr } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_enabled', true)
        .eq('is_published', true)
        .single();

      if (!alive) return;

      if (postErr || !postData) {
        setPost(null);
        setBlocks([]);
        setLoading(false);
        return;
      }

      // blocks
      const { data: blocksData } = await supabase
        .from('blog_post_blocks')
        .select('*')
        .eq('post_id', postData.id)
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      // category (optional)
      let cat = null;
      if (postData.category_id) {
        const { data: catData } = await supabase
          .from('blog_categories')
          .select('*')
          .eq('id', postData.category_id)
          .eq('is_enabled', true)
          .single();
        cat = catData || null;
      }

      if (!alive) return;

      setPost(postData);
      setBlocks(blocksData || []);
      setCategory(cat);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading post...</div>;
  }

  if (!post) {
    return (
      <div className="py-5 text-center">
        <h1 className="h4">Post not found</h1>
        <div className="opacity-75">This post may be unpublished or the link is incorrect.</div>
      </div>
    );
  }

  const hydratedPost = { ...post, category };

  return (
    <BlogPostSection className="pt-4">
      <div className="mb-3">
        <BlogMeta post={hydratedPost} />
      </div>

      <h1 className="display-6 fw-bold mb-3">{post.title}</h1>
      {post.excerpt ? <p className="lead opacity-75">{post.excerpt}</p> : null}

      <ContentBlocks blocks={blocks} />
    </BlogPostSection>
  );
}
