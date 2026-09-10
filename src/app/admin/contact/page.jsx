"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminSection from "@/components/admin/AdminSection";
import AdminVisibilityToggle from "@/components/admin/AdminVisibilityToggle";

const defaultSocials = {
  facebook: "",
  linkedin: "",
  github: "",
  x: "",
  instagram: "",
  youtube: "",
};

const socialPlaceholders = {
  facebook: "https://facebook.com/yourpage",
  linkedin: "https://linkedin.com/in/yourname",
  github: "https://github.com/yourname",
  x: "https://x.com/yourhandle",
  instagram: "https://instagram.com/yourhandle",
  youtube: "https://youtube.com/@yourchannel",
};

export default function AdminContactPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [settings, setSettings] = useState(null);

  const draftSocials = useMemo(() => {
    const base = settings?.socials || {};
    const fromDraft = draft?.socials || {};
    return { ...defaultSocials, ...base, ...fromDraft };
  }, [settings?.socials, draft?.socials]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/contact");
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from("section_contact_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (sErr) {
        setError(sErr.message || "Failed to load contact settings.");
        setLoading(false);
        return;
      }

      setSettings(s || null);
      setDraft(s ? { ...s } : null);
      setDirty(false);

      setLoading(false);
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [router]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => {
      if (mountedRef.current) setNotice("");
    }, 2000);
  };

  const markDirty = (nextDraft) => {
    setDraft(nextDraft);
    setDirty(true);
  };

  const normalizeSettingsPatch = (d) => {
    if (!settings?.id || !d) return null;

    return {
      heading: (d.heading || "").trim() || null,
      subheading: (d.subheading || "").trim() || null,
      recipient_email: (d.recipient_email || "").trim() || null,
      booking_url: (d.booking_url || "").trim() || null,
      public_email: (d.public_email || "").trim() || null,
      phone: (d.phone || "").trim() || null,
      hours_text: (d.hours_text || "").trim() || null,
      timezone: (d.timezone || "").trim() || null,
      socials: d.socials || { ...defaultSocials },
      is_published: !!d.is_published,
    };
  };

  const saveAll = async () => {
    if (!settings?.id || !draft) return;

    const patch = normalizeSettingsPatch(draft);
    if (!patch) return;

    const ok = await confirm({
      title: "Save contact settings?",
      message: "Apply your changes to the contact section settings.",
      confirmText: "Save",
      confirmVariant: "success",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("section_contact_settings")
        .update(patch)
        .eq("id", settings.id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setSettings(data);
      setDraft({ ...data });
      setDirty(false);

      toast("Saved.");
      success({ title: "Settings saved", message: "Contact settings were updated." });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const discardChanges = () => {
    if (!settings) return;
    setDraft({ ...settings });
    setDirty(false);
    toast("Changes discarded.");
  };

  const openInbox = () => router.push("/admin/contact/inbox");

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted py-4">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Loading the Contact editor…
      </div>
    );
  }

  if (!settings || !draft) {
    return <AdminPageShell error="No settings row was found. Re-run the seed SQL for section_contact_settings." />;
  }

  return (
    <AdminPageShell
      preview="/#contact"
      dirty={dirty}
      saving={busy}
      onSave={saveAll}
      error={error}
      notice={notice}
      extraActions={
        <>
          <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !dirty} type="button">
            <i className="fa-solid fa-rotate-left me-2"></i>Discard
          </button>
          <button className="btn btn-outline-secondary" onClick={openInbox} disabled={busy} type="button">
            <i className="fa-solid fa-inbox me-2"></i>Messages
          </button>
        </>
      }
    >
      <AdminSection
        title="Contact details"
        description="The heading, contact methods, and availability shown in your Contact section."
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Heading</label>
            <input
              className="form-control"
              placeholder="Let's work together"
              value={draft.heading || ""}
              onChange={(e) => markDirty({ ...draft, heading: e.target.value })}
              disabled={busy}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Subheading</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Tell visitors how you can help and what to expect next."
              value={draft.subheading || ""}
              onChange={(e) => markDirty({ ...draft, subheading: e.target.value })}
              disabled={busy}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Where messages are delivered</label>
            <input
              className="form-control"
              placeholder="you@yourdomain.com"
              value={draft.recipient_email || ""}
              onChange={(e) => markDirty({ ...draft, recipient_email: e.target.value })}
              disabled={busy}
            />
            <div className="form-text">Form submissions go here and also appear on the Messages page.</div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Booking link (optional)</label>
            <input
              className="form-control"
              placeholder="https://calendly.com/yourname"
              value={draft.booking_url || ""}
              onChange={(e) => markDirty({ ...draft, booking_url: e.target.value })}
              disabled={busy}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Public email</label>
            <input
              className="form-control"
              placeholder="hello@yourdomain.com"
              value={draft.public_email || ""}
              onChange={(e) => markDirty({ ...draft, public_email: e.target.value })}
              disabled={busy}
            />
            <div className="form-text">Shown publicly on your site.</div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Phone (optional)</label>
            <input
              className="form-control"
              placeholder="+1 (555) 123-4567"
              value={draft.phone || ""}
              onChange={(e) => markDirty({ ...draft, phone: e.target.value })}
              disabled={busy}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Hours</label>
            <input
              className="form-control"
              placeholder="Mon-Fri, 9am-5pm"
              value={draft.hours_text || ""}
              onChange={(e) => markDirty({ ...draft, hours_text: e.target.value })}
              disabled={busy}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">Timezone</label>
            <input
              className="form-control"
              placeholder="UTC+8 (Manila)"
              value={draft.timezone || ""}
              onChange={(e) => markDirty({ ...draft, timezone: e.target.value })}
              disabled={busy}
            />
          </div>
        </div>

        <div className="mt-4">
          <AdminVisibilityToggle
            checked={!!draft.is_published}
            onChange={(v) => markDirty({ ...draft, is_published: v })}
            disabled={busy}
            help="Turn this on to show the Contact section on your site."
          />
        </div>
      </AdminSection>

      <AdminSection title="Social links" description="Paste the full profile or channel link for each. Leave blank to hide.">
        <div className="row g-3">
          {Object.keys(defaultSocials).map((key) => (
            <div className="col-12 col-md-6" key={key}>
              <label className="form-label text-capitalize">{key}</label>
              <input
                className="form-control"
                placeholder={socialPlaceholders[key] || "https://"}
                value={draftSocials[key] || ""}
                onChange={(e) => {
                  const nextSocials = { ...draftSocials, [key]: e.target.value };
                  markDirty({ ...draft, socials: nextSocials });
                }}
                disabled={busy}
              />
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </AdminPageShell>
  );
}
