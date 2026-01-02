'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import BlogSection from '@/components/blog/BlogSection';
import BlogGrid from '@/components/blog/BlogGrid';

export default function BlogPage() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [settingsRes, categoriesRes, postsRes] = await Promise.all([
        supabase.from('blog_page_settings').select('*').eq('id', true).single(),
        supabase
          .from('blog_categories')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('blog_posts')
          .select('*')
          .eq('is_enabled', true)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .order('sort_order', { ascending: true }),
      ]);

      if (!alive) return;

      setSettings(settingsRes.data || null);
      setCategories(categoriesRes.data || []);
      setPosts(postsRes.data || []);
      setLoading(false);
    };

    load();
    return () => { alive = false; };
  }, []);

  const categoriesById = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const hydratedPosts = useMemo(() => {
    return posts.map((p) => ({
      ...p,
      category: p.category_id ? categoriesById.get(p.category_id) : null,
    }));
  }, [posts, categoriesById]);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading blog...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <BlogSection className="pt-4">
      <div className="text-center mb-4">
        <h1 className="display-6 fw-bold">{settings.title}</h1>
        {settings.subtitle ? <p className="lead opacity-75 mb-0">{settings.subtitle}</p> : null}
      </div>

      <BlogGrid posts={hydratedPosts} />
    </BlogSection>
  );
}
