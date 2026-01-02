'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import HeroSection from '@/components/home/HeroSection';
import VideoIntro from '@/components/home/VideoIntro';
import AboutSection from '@/components/home/AboutSection';
import ListColumns from '@/components/home/ListColumns';
import CoreServicesSnapshot from '@/components/home/CoreServicesSnapshot';
import WhyWorkWithMe from '@/components/home/WhyWorkWithMe';
import ToolsPreview from '@/components/home/ToolsPreview';
import TestimonialPreview from '@/components/home/TestimonialPreview';
import FinalCTA from '@/components/home/FinalCTA';

export default function HomePage() {
  const [data, setData] = useState({
    hero: null,
    video: null,
    about: null,
    listColumns: [],
    servicesSettings: null,
    servicesItems: [],
    whySettings: null,
    whyPoints: [],
    toolsSettings: null,
    toolsItems: [],
    testimonialSettings: null,
    testimonialItems: [],
    finalCta: null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [
        heroRes,
        videoRes,
        aboutRes,
        listRes,
        servicesSettingsRes,
        servicesItemsRes,
        whySettingsRes,
        whyPointsRes,
        toolsSettingsRes,
        toolsItemsRes,
        testimonialSettingsRes,
        testimonialItemsRes,
        finalCtaRes,
      ] = await Promise.all([
        supabase.from('home_hero').select('*').eq('id', true).single(),
        supabase.from('home_video_intro').select('*').eq('id', true).single(),
        supabase.from('home_about').select('*').eq('id', true).single(),
        supabase
          .from('home_list_columns')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase.from('home_services_snapshot_settings').select('*').eq('id', true).single(),
        supabase
          .from('home_services_snapshot_items')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase.from('home_why_settings').select('*').eq('id', true).single(),
        supabase
          .from('home_why_points')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase.from('home_tools_preview_settings').select('*').eq('id', true).single(),
        supabase
          .from('home_tools_preview_items')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase.from('home_testimonial_preview_settings').select('*').eq('id', true).single(),
        supabase
          .from('home_testimonial_preview_items')
          .select('*')
          .eq('is_enabled', true)
          .order('sort_order', { ascending: true }),
        supabase.from('home_final_cta').select('*').eq('id', true).single(),
      ]);

      if (!alive) return;

      setData({
        hero: heroRes.data,
        video: videoRes.data,
        about: aboutRes.data,
        listColumns: listRes.data || [],
        servicesSettings: servicesSettingsRes.data,
        servicesItems: servicesItemsRes.data || [],
        whySettings: whySettingsRes.data,
        whyPoints: whyPointsRes.data || [],
        toolsSettings: toolsSettingsRes.data,
        toolsItems: toolsItemsRes.data || [],
        testimonialSettings: testimonialSettingsRes.data,
        testimonialItems: testimonialItemsRes.data || [],
        finalCta: finalCtaRes.data,
      });

      setLoading(false);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-5">
        <div className="text-center opacity-75">Loading home content...</div>
      </div>
    );
  }

  return (
    <>
      <HeroSection data={data.hero} />
      <VideoIntro data={data.video} />
      <AboutSection data={data.about} />
      <ListColumns columns={data.listColumns} />
      <CoreServicesSnapshot settings={data.servicesSettings} items={data.servicesItems} />
      <WhyWorkWithMe settings={data.whySettings} points={data.whyPoints} />
      <ToolsPreview settings={data.toolsSettings} items={data.toolsItems} />
      <TestimonialPreview settings={data.testimonialSettings} items={data.testimonialItems} />
      <FinalCTA data={data.finalCta} />
    </>
  );
}
