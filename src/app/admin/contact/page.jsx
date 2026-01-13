"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const defaultSocials = {
  facebook: "",
  linkedin: "",
  github: "",
  x: "",
  instagram: "",
  youtube: "",
};

export default function AdminContactPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [settings, setSettings] = useState(null);
  const socials = useMemo(() => ({ ...defaultSocials, ...(settings?.socials || {}) }), [settings]);

  const [inbox, setInbox] = useState([]);

  // test form
  const [test, setTest] = useState({ name: "", email: "", subject: "", message: "" });

  useEffect(() => {
    let alive = true;

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

      const { data: m } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (!alive) return;

      if (sErr) {
        setError(sErr.message || "Failed to load contact settings.");
        setLoading(false);
        return;
      }

      setSettings(s || null);
      setInbox(m || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  };

  const saveSettings = async (patch) => {
    if (!settings?.id) return;

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
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const reloadInbox = async () => {
    const { data } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    setInbox(data || []);
  };

  const submitTest = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!test.name.trim()) throw new Error("Name is required.");
      if (!test.email.trim()) throw new Error("Email is required.");
      if (!test.message.trim()) throw new Error("Message is required.");

      const { error: insErr } = await supabase.from("contact_messages").insert([{
        name: test.name.trim(),
        email: test.email.trim(),
        subject: test.subject.trim() || null,
        message: test.message.trim(),
        page_url: "/admin/contact (test)",
        user_agent: navigator.userAgent,
      }]);

      if (insErr) throw insErr;

      setTest({ name: "", email: "", subject: "", message: "" });
      toast("Test message sent.");
      await reloadInbox();
    } catch (e) {
      setError(e.message || "Send failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm("Delete this message?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("contact_messages").delete().eq("id", id);
      if (delErr) throw delErr;

      toast("Deleted.");
      await reloadInbox();
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = () => window.open("/#contact", "_blank");

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

  if (!settings) {
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

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreview}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>
            <button className="btn btn-outline-primary" onClick={() => router.push("/admin")}>
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

        <div className="row g-3">
          {/* Settings */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3">Settings</h2>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label">Heading</label>
                    <input className="form-control" defaultValue={settings.heading || ""} onBlur={(e) => saveSettings({ heading: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Subheading</label>
                    <textarea className="form-control" rows="2" defaultValue={settings.subheading || ""} onBlur={(e) => saveSettings({ subheading: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Recipient Email (admin)</label>
                    <input className="form-control" defaultValue={settings.recipient_email || ""} onBlur={(e) => saveSettings({ recipient_email: e.target.value.trim() || null })} disabled={busy} />
                    <div className="form-text">Display / reference only (no sending without API).</div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Booking URL (Calendly)</label>
                    <input className="form-control" defaultValue={settings.booking_url || ""} onBlur={(e) => saveSettings({ booking_url: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Public Email</label>
                    <input className="form-control" defaultValue={settings.public_email || ""} onBlur={(e) => saveSettings({ public_email: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Phone</label>
                    <input className="form-control" defaultValue={settings.phone || ""} onBlur={(e) => saveSettings({ phone: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Hours</label>
                    <input className="form-control" defaultValue={settings.hours_text || ""} onBlur={(e) => saveSettings({ hours_text: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Timezone</label>
                    <input className="form-control" defaultValue={settings.timezone || ""} onBlur={(e) => saveSettings({ timezone: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <div className="fw-semibold mb-2">Socials</div>
                    <div className="row g-2">
                      {Object.keys(defaultSocials).map((key) => (
                        <div className="col-12 col-md-6" key={key}>
                          <label className="form-label text-capitalize">{key}</label>
                          <input
                            className="form-control"
                            defaultValue={socials[key] || ""}
                            onBlur={(e) => {
                              const next = { ...socials, [key]: e.target.value.trim() || "" };
                              saveSettings({ socials: next });
                            }}
                            disabled={busy}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-12 d-flex align-items-center justify-content-between mt-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        defaultChecked={!!settings.is_published}
                        onChange={(e) => saveSettings({ is_published: e.target.checked })}
                        disabled={busy}
                        id="contactPub"
                      />
                      <label className="form-check-label" htmlFor="contactPub">Published</label>
                    </div>

                    <button className="btn btn-outline-secondary" onClick={reloadInbox} disabled={busy}>
                      <i className="fa-solid fa-rotate me-2"></i>Refresh Inbox
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Test Form + Inbox */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">Test Form (writes to inbox)</h2>

                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Name *</label>
                    <input className="form-control" value={test.name} onChange={(e) => setTest((p) => ({ ...p, name: e.target.value }))} disabled={busy} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Email *</label>
                    <input className="form-control" value={test.email} onChange={(e) => setTest((p) => ({ ...p, email: e.target.value }))} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Subject</label>
                    <input className="form-control" value={test.subject} onChange={(e) => setTest((p) => ({ ...p, subject: e.target.value }))} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Message *</label>
                    <textarea className="form-control" rows="4" value={test.message} onChange={(e) => setTest((p) => ({ ...p, message: e.target.value }))} disabled={busy} />
                  </div>

                  <div className="col-12 d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={submitTest} disabled={busy}>
                      <i className="fa-solid fa-paper-plane me-2"></i>Send Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3">Inbox (latest 25)</h2>

                {!inbox.length ? <div className="text-muted">No messages yet.</div> : null}

                <div className="vstack gap-2">
                  {inbox.map((m) => (
                    <div key={m.id} className="border rounded p-3 bg-white">
                      <div className="d-flex justify-content-between gap-2">
                        <div>
                          <div className="fw-semibold">{m.name} <span className="text-muted small">({m.email})</span></div>
                          <div className="text-muted small">{new Date(m.created_at).toLocaleString()}</div>
                          {m.subject ? <div className="small mt-1"><span className="fw-semibold">Subject:</span> {m.subject}</div> : null}
                        </div>

                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMessage(m.id)} disabled={busy}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>

                      <div className="small text-muted mt-2" style={{ whiteSpace: "pre-wrap" }}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
