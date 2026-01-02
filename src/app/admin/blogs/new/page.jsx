'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminBlogNewPage() {
  const router = useRouter();
  const [msg, setMsg] = useState('Creating draft...');

  useEffect(() => {
    const run = async () => {
      const now = Date.now();
      const payload = {
        title: 'New Post',
        slug: `new-post-${now}`,
        excerpt: '',
        is_enabled: true,
        is_published: false,
        published_at: null,
        tags: [],
      };

      const { data, error } = await supabase.from('blog_posts').insert(payload).select('*').single();

      if (error) {
        setMsg(error.message);
        return;
      }

      router.replace(`/admin/blogs/${data.id}/edit`);
    };

    run();
  }, [router]);

  return <div className="py-5 text-center opacity-75">{msg}</div>;
}
