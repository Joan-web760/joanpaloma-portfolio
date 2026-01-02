'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import ContactSection from '@/components/contact/ContactSection';
import ContactHeader from '@/components/contact/ContactHeader';
import ContactForm from '@/components/contact/ContactForm';
import CalendlyEmbed from '@/components/contact/CalendlyEmbed';

export default function ContactPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('contact_page_settings')
        .select('*')
        .eq('id', true)
        .single();

      if (!alive) return;

      setSettings(data || null);
      setLoading(false);
    };

    load();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="py-5 text-center opacity-75">Loading contact...</div>;
  }

  if (!settings?.is_enabled) return null;

  return (
    <ContactSection className="pt-4">
      <ContactHeader title={settings.title} subtitle={settings.subtitle} />

      <div className="row g-4 mt-2">
        {settings.show_form ? (
          <div className="col-lg-6">
            <ContactForm settings={settings} />
          </div>
        ) : null}

        {settings.show_calendly && settings.calendly_url ? (
          <div className="col-lg-6">
            <CalendlyEmbed url={settings.calendly_url} />
          </div>
        ) : null}
      </div>
    </ContactSection>
  );
}
