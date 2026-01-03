'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Toggle from '@/components/admin/forms/Toggle';

const normalizeSocials = (arr) => (Array.isArray(arr) ? arr : []);

export default function SettingsForm({ site, setSite, onReload }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const socials = normalizeSocials(site?.social_links);
  const s1 = socials[0] || { label: 'GitHub', href: '', icon: 'fa-brands fa-github' };
  const s2 = socials[1] || { label: 'LinkedIn', href: '', icon: 'fa-brands fa-linkedin' };

  const setSocial = (idx, patch) => {
    const next = [...socials];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setSite((p) => ({ ...(p || {}), social_links: next }));
  };

  const save = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);

    const patch = {
      is_enabled: !!site?.is_enabled,

      site_name: site?.site_name || 'My Portfolio',
      tagline: site?.tagline || null,

      nav_brand_label: site?.nav_brand_label || 'Brand',
      nav_cta_label: site?.nav_cta_label || 'Book a Call',
      nav_cta_href: site?.nav_cta_href || '/contact',

      footer_text: site?.footer_text || null,
      social_links: normalizeSocials(site?.social_links),

      contact_email: site?.contact_email || null,
      contact_phone: site?.contact_phone || null,
      calendly_url: site?.calendly_url || null,
    };

    const { data, error } = await supabase
      .from('site_settings')
      .update(patch)
      .eq('id', true)
      .select('*')
      .single();

    setBusy(false);

    if (error) {
      setMsg({ type: 'danger', text: error.message });
      return;
    }

    setSite(data);
    setMsg({ type: 'success', text: 'Saved.' });
  };

  if (!site) return <div className="opacity-75">Missing site settings row.</div>;

  return (
    <AdminCard title="Site Settings">
      {msg.text ? <div className={`alert alert-${msg.type}`}>{msg.text}</div> : null}

      <Toggle
        label="Enabled"
        checked={!!site.is_enabled}
        onChange={(v) => setSite((p) => ({ ...p, is_enabled: v }))}
        hint="Disable if you want to hide public content that depends on settings."
      />

      <TextInput
        label="Site Name"
        value={site.site_name || ''}
        onChange={(v) => setSite((p) => ({ ...p, site_name: v }))}
      />

      <TextInput
        label="Tagline"
        value={site.tagline || ''}
        onChange={(v) => setSite((p) => ({ ...p, tagline: v }))}
      />

      <hr className="border-secondary" />

      <div className="fw-semibold mb-2">Navbar</div>
      <TextInput
        label="Brand Label"
        value={site.nav_brand_label || ''}
        onChange={(v) => setSite((p) => ({ ...p, nav_brand_label: v }))}
      />
      <TextInput
        label="CTA Label"
        value={site.nav_cta_label || ''}
        onChange={(v) => setSite((p) => ({ ...p, nav_cta_label: v }))}
      />
      <TextInput
        label="CTA Href"
        value={site.nav_cta_href || ''}
        onChange={(v) => setSite((p) => ({ ...p, nav_cta_href: v }))}
      />

      <hr className="border-secondary" />

      <div className="fw-semibold mb-2">Footer</div>
      <TextInput
        label="Footer Text"
        value={site.footer_text || ''}
        onChange={(v) => setSite((p) => ({ ...p, footer_text: v }))}
      />

      <div className="fw-semibold mt-3 mb-2">Social Links (2 slots)</div>

      <div className="card bg-dark text-light border border-secondary mb-2">
        <div className="card-body">
          <TextInput label="Label" value={s1.label || ''} onChange={(v) => setSocial(0, { label: v })} />
          <TextInput label="Href" value={s1.href || ''} onChange={(v) => setSocial(0, { href: v })} />
          <TextInput label="Icon Class" value={s1.icon || ''} onChange={(v) => setSocial(0, { icon: v })} />
        </div>
      </div>

      <div className="card bg-dark text-light border border-secondary mb-2">
        <div className="card-body">
          <TextInput label="Label" value={s2.label || ''} onChange={(v) => setSocial(1, { label: v })} />
          <TextInput label="Href" value={s2.href || ''} onChange={(v) => setSocial(1, { href: v })} />
          <TextInput label="Icon Class" value={s2.icon || ''} onChange={(v) => setSocial(1, { icon: v })} />
        </div>
      </div>

      <hr className="border-secondary" />

      <div className="fw-semibold mb-2">Contact</div>
      <TextInput
        label="Contact Email"
        value={site.contact_email || ''}
        onChange={(v) => setSite((p) => ({ ...p, contact_email: v }))}
      />
      <TextInput
        label="Contact Phone"
        value={site.contact_phone || ''}
        onChange={(v) => setSite((p) => ({ ...p, contact_phone: v }))}
      />
      <TextInput
        label="Calendly URL"
        value={site.calendly_url || ''}
        onChange={(v) => setSite((p) => ({ ...p, calendly_url: v }))}
        placeholder="https://calendly.com/..."
      />

      <div className="d-flex gap-2 flex-wrap mt-2">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </button>
        <button className="btn btn-outline-secondary" onClick={onReload} disabled={busy}>
          Reload
        </button>
      </div>
    </AdminCard>
  );
}
