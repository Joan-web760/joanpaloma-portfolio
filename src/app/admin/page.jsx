'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

import StatsCards from '@/components/admin/dashboard/StatsCards';
import ContentStatsChart from '@/components/admin/dashboard/ContentStatsChart';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError('');

      const { data, error } = await supabase.rpc('admin_dashboard_stats');

      if (!alive) return;

      if (error) {
        setError(error.message);
        setStats(null);
        setLoading(false);
        return;
      }

      setStats(data || null);
      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const s = stats || {};
    return [
      { label: 'Blog Posts', value: s.blog_posts ?? 0, icon: 'fa-regular fa-newspaper' },
      { label: 'Blog Blocks', value: s.blog_blocks ?? 0, icon: 'fa-solid fa-layer-group' },
      { label: 'Portfolio Items', value: s.portfolio_items ?? 0, icon: 'fa-solid fa-briefcase' },
      { label: 'Portfolio Images', value: s.portfolio_images ?? 0, icon: 'fa-regular fa-images' },
      { label: 'Testimonials', value: s.testimonials ?? 0, icon: 'fa-solid fa-quote-left' },
      { label: 'Pricing Plans', value: s.pricing_plans ?? 0, icon: 'fa-solid fa-tags' },
      { label: 'FAQ Items', value: s.faq_items ?? 0, icon: 'fa-solid fa-circle-question' },
      { label: 'Tools Items', value: s.tools_items ?? 0, icon: 'fa-solid fa-screwdriver-wrench' },
      { label: 'Experience Items', value: s.experience_items ?? 0, icon: 'fa-solid fa-timeline' },
      { label: 'Contact Messages', value: s.contact_messages ?? 0, icon: 'fa-regular fa-envelope' },
    ];
  }, [stats]);

  const chartData = useMemo(() => {
    const s = stats || {};
    return {
      labels: [
        'Blog Posts',
        'Portfolio',
        'Testimonials',
        'Pricing',
        'FAQ',
        'Tools',
        'Experience',
        'Messages',
      ],
      values: [
        s.blog_posts ?? 0,
        s.portfolio_items ?? 0,
        s.testimonials ?? 0,
        s.pricing_plans ?? 0,
        s.faq_items ?? 0,
        s.tools_items ?? 0,
        s.experience_items ?? 0,
        s.contact_messages ?? 0,
      ],
    };
  }, [stats]);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading dashboard...</div>;
  }

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Quick overview of your content across the site."
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <StatsCards items={cards} />

      <div className="mt-4">
        <AdminCard title="Content Distribution">
          <ContentStatsChart labels={chartData.labels} values={chartData.values} />
        </AdminCard>
      </div>
    </>
  );
}
