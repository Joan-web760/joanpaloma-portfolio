'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import Toggle from '@/components/admin/forms/Toggle';

const emptyNavLink = () => ({
  label: '',
  href: '',
  is_enabled: true,
});

const emptySocial = () => ({
  label: '',
  href: '',
  icon_class: 'fa-brands fa-github',
  is_enabled: true,
});

export default function SettingsForm({ site, setSite, onReload }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [navLinks, setNavLinks] = useState([]);
  const [socials, setSocials] = useState([]);

  /* -------------------- LOAD CHILD TABLES -------------------- */
  useEffect(() => {
    (async () => {
      const [navRes, socialRes] = await Promise.all([
        supabase.from('site_navbar_links').select('*').order('sort_order'),
        supabase.from('site_footer_social_links').select('*').order('sort_order'),
      ]);

      setNavLinks(navRes.data || []);
      setSocials(socialRes.data || []);
    })();
  }, []);

  /* -------------------- HELPERS -------------------- */
  const patchArray = (setFn, idx, patch) => {
    setFn((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const removeAt = (setFn, idx) => {
    setFn((prev) => prev.filter((_, i) => i !== idx));
  };

  /* -------------------- SAVE -------------------- */
  const save = async () => {
    setBusy(true);
    setMsg({ type: '', text: '' });

    try {
      /* ---------- NAVBAR SETTINGS ---------- */
      await supabase.from('site_navbar_settings').upsert({
        id: true,
        brand_label: site.brand_label || 'Your Name',
        brand_href: site.brand_href || '/',
        cta_enabled: site.cta_enabled ?? true,
        cta_label: site.cta_label || 'Book a Call',
        cta_href: site.cta_href || '/contact',
        updated_at: new Date().toISOString(),
      });

      /* ---------- FOOTER SETTINGS ---------- */
      await supabase.from('site_footer_settings').upsert({
        id: true,
        footer_text: site.footer_text || '© Your Name. All rights reserved.',
        show_social_links: site.show_social_links ?? true,
        updated_at: new Date().toISOString(),
      });

      /* ---------- NAV LINKS ---------- */
      await supabase.from('site_navbar_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (navLinks.length) {
        await supabase.from('site_navbar_links').insert(
          navLinks.map((l, i) => ({
            label: l.label,
            href: l.href,
            is_enabled: l.is_enabled ?? true,
            sort_order: i + 1,
          }))
        );
      }

      /* ---------- SOCIAL LINKS ---------- */
      await supabase.from('site_footer_social_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (socials.length) {
        await supabase.from('site_footer_social_links').insert(
          socials.map((s, i) => ({
            label: s.label,
            href: s.href,
            icon_class: s.icon_class,
            is_enabled: s.is_enabled ?? true,
            sort_order: i + 1,
          }))
        );
      }

      setMsg({ type: 'success', text: 'Saved successfully.' });
      onReload?.();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message || 'Save failed.' });
    } finally {
      setBusy(false);
    }
  };

  if (!site) return <div className="opacity-75">Missing site settings row.</div>;

  /* -------------------- UI -------------------- */
  return (
    <AdminCard title="Site Settings">
      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* NAVBAR */}
      <div className="fw-semibold mb-2">Navbar</div>

      <TextInput label="Brand Label" value={site.brand_label || ''} onChange={(v) => setSite((p) => ({ ...p, brand_label: v }))} />
      <TextInput label="Brand Href" value={site.brand_href || ''} onChange={(v) => setSite((p) => ({ ...p, brand_href: v }))} />

      <Toggle label="CTA Enabled" checked={!!site.cta_enabled} onChange={(v) => setSite((p) => ({ ...p, cta_enabled: v }))} />
      <TextInput label="CTA Label" value={site.cta_label || ''} onChange={(v) => setSite((p) => ({ ...p, cta_label: v }))} />
      <TextInput label="CTA Href" value={site.cta_href || ''} onChange={(v) => setSite((p) => ({ ...p, cta_href: v }))} />

      <div className="fw-semibold mt-3">Navbar Links</div>
      {navLinks.map((l, i) => (
        <div key={i} className="card bg-dark border-secondary mt-2 p-3">
          <Toggle label="Enabled" checked={l.is_enabled} onChange={(v) => patchArray(setNavLinks, i, { is_enabled: v })} />
          <TextInput label="Label" value={l.label} onChange={(v) => patchArray(setNavLinks, i, { label: v })} />
          <TextInput label="Href" value={l.href} onChange={(v) => patchArray(setNavLinks, i, { href: v })} />
          <button className="btn btn-sm btn-outline-danger mt-2" onClick={() => removeAt(setNavLinks, i)}>
            Remove
          </button>
        </div>
      ))}

      <button className="btn btn-outline-light btn-sm mt-2" onClick={() => setNavLinks((p) => [...p, emptyNavLink()])}>
        + Add Navbar Link
      </button>

      <hr className="border-secondary" />

      {/* FOOTER */}
      <div className="fw-semibold mb-2">Footer</div>
      <TextInput label="Footer Text" value={site.footer_text || ''} onChange={(v) => setSite((p) => ({ ...p, footer_text: v }))} />
      <Toggle label="Show Social Links" checked={!!site.show_social_links} onChange={(v) => setSite((p) => ({ ...p, show_social_links: v }))} />

      <div className="fw-semibold mt-3">Social Links</div>
      {socials.map((s, i) => (
        <div key={i} className="card bg-dark border-secondary mt-2 p-3">
          <Toggle label="Enabled" checked={s.is_enabled} onChange={(v) => patchArray(setSocials, i, { is_enabled: v })} />
          <TextInput label="Label" value={s.label} onChange={(v) => patchArray(setSocials, i, { label: v })} />
          <TextInput label="Href" value={s.href} onChange={(v) => patchArray(setSocials, i, { href: v })} />
          <TextInput label="Icon Class" value={s.icon_class} onChange={(v) => patchArray(setSocials, i, { icon_class: v })} />
          <button className="btn btn-sm btn-outline-danger mt-2" onClick={() => removeAt(setSocials, i)}>
            Remove
          </button>
        </div>
      ))}

      <button className="btn btn-outline-light btn-sm mt-2" onClick={() => setSocials((p) => [...p, emptySocial()])}>
        + Add Social Link
      </button>

      <div className="d-flex gap-2 mt-4">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button className="btn btn-outline-secondary" onClick={onReload} disabled={busy}>
          Reload
        </button>
      </div>
    </AdminCard>
  );
}
