"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";
import AdminStepper, { AdminStep } from "@/components/admin/AdminStepper";

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

  // busy = only for async actions (save)
  const [busy, setBusy] = useState(false);

  // staged edits
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
      setDraft(s ? { ...s } : null); // init draft from DB
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

    // Only fields you actually edit here
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
      setDraft({ ...data }); // re-sync draft to saved server state
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
    toast("Discarded changes.");
  };

  const openPreview = () => window.open("/#contact", "_blank");
  const openInbox = () => router.push("/admin/contact/inbox");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Contact editor...
        </div>
      </div>
    );
  }

  if (!settings || !draft) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">No row found in section_contact_settings. Re-run the seed SQL.</div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Contact</h1>
            <div className="small text-muted">Edit contact settings and review incoming messages.</div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            {/* NEW: Save / Discard */}
            <button className="btn btn-primary" onClick={saveAll} disabled={busy || !dirty}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-2"></i>
                  Save Changes
                </>
              )}
            </button>

            <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !dirty}>
              <i className="fa-solid fa-rotate-left me-2"></i>Discard
            </button>

            <button className="btn btn-outline-dark" onClick={openPreview} disabled={busy}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>
            <button className="btn btn-outline-secondary" onClick={openInbox} disabled={busy}>
              <i className="fa-solid fa-inbox me-2"></i>Inbox
            </button>
            <button className="btn btn-outline-primary" onClick={() => router.push("/admin")} disabled={busy}>
              <i className="fa-solid fa-arrow-left me-2"></i>Dashboard
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger py-2">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="alert alert-success py-2">
            <i className="fa-solid fa-circle-check me-2"></i>
            {notice}
          </div>
        ) : null}

        {dirty ? (
          <div className="alert alert-warning py-2">
            <i className="fa-solid fa-pen-to-square me-2"></i>
            You have unsaved changes.
          </div>
        ) : null}

        <AdminStepper>
          <AdminStep title="Contact Settings" description="Edit headings, emails, socials, and publish status.">
            <div className="row g-3">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h2 className="h6 mb-3">Settings</h2>

                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label">Heading</label>
                        <input
                          className="form-control"
                          placeholder="Let's work together"
                          value={draft.heading || ""}
                          onChange={(e) => markDirty({ ...draft, heading: e.target.value })}
                          disabled={busy}
                        />
                        <div className="form-text">Main headline for your contact section.</div>
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
                        <div className="form-text">Short supporting line under the heading.</div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Recipient Email (admin)</label>
                        <input
                          className="form-control"
                          placeholder="you@yourdomain.com"
                          value={draft.recipient_email || ""}
                          onChange={(e) => markDirty({ ...draft, recipient_email: e.target.value })}
                          disabled={busy}
                        />
                        <div className="form-text">Where you want inquiries delivered. Messages also appear in the inbox page.</div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Booking URL (Calendly)</label>
                        <input
                          className="form-control"
                          placeholder="https://calendly.com/yourname"
                          value={draft.booking_url || ""}
                          onChange={(e) => markDirty({ ...draft, booking_url: e.target.value })}
                          disabled={busy}
                        />
                        <div className="form-text">Optional link for scheduling calls.</div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Public Email</label>
                        <input
                          className="form-control"
                          placeholder="hello@yourdomain.com"
                          value={draft.public_email || ""}
                          onChange={(e) => markDirty({ ...draft, public_email: e.target.value })}
                          disabled={busy}
                        />
                        <div className="form-text">Email address shown publicly on your site.</div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Phone</label>
                        <input
                          className="form-control"
                          placeholder="+1 (555) 123-4567"
                          value={draft.phone || ""}
                          onChange={(e) => markDirty({ ...draft, phone: e.target.value })}
                          disabled={busy}
                        />
                        <div className="form-text">Optional phone number for contact.</div>
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
                        <div className="form-text">Let clients know your typical availability.</div>
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
                        <div className="form-text">Helps clients schedule across time zones.</div>
                      </div>

                      <div className="col-12">
                        <div className="fw-semibold mb-2">Socials</div>
                        <div className="row g-2">
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
                              <div className="form-text">Paste the full profile or channel link.</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-12 d-flex align-items-center justify-content-between mt-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={!!draft.is_published}
                            onChange={(e) => markDirty({ ...draft, is_published: e.target.checked })}
                            disabled={busy}
                            id="contactPub"
                          />
                          <label className="form-check-label" htmlFor="contactPub">
                            Published
                          </label>
                          <div className="form-text">Show the Contact section on your site.</div>
                        </div>

                        <button className="btn btn-outline-secondary" onClick={openInbox} disabled={busy}>
                          <i className="fa-solid fa-inbox me-2"></i>Open Inbox
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AdminStep>
        </AdminStepper>
      </div>
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
