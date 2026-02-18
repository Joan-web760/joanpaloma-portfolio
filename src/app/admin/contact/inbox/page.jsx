"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

export default function AdminContactInboxPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [inbox, setInbox] = useState([]);

  const [test, setTest] = useState({ name: "", email: "", subject: "", message: "" });

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/contact/inbox");
        return;
      }

      const { data: m, error: mErr } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (!mountedRef.current) return;

      if (mErr) {
        setError(mErr.message || "Failed to load inbox.");
        setLoading(false);
        return;
      }

      setInbox(m || []);
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

  const reloadInbox = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: rErr } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (rErr) throw rErr;
      setInbox(data || []);
      toast("Inbox refreshed.");
    } catch (e) {
      setError(e.message || "Failed to refresh inbox.");
    } finally {
      setBusy(false);
    }
  };

  const submitTest = async () => {
    const ok = await confirm({
      title: "Send test message?",
      message: "This will add a test message to the inbox.",
      confirmText: "Send",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!test.name.trim()) throw new Error("Name is required.");
      if (!test.email.trim()) throw new Error("Email is required.");
      if (!test.message.trim()) throw new Error("Message is required.");

      const { error: insErr } = await supabase.from("contact_messages").insert([
        {
          name: test.name.trim(),
          email: test.email.trim(),
          subject: test.subject.trim() || null,
          message: test.message.trim(),
          page_url: "/admin/contact/inbox (test)",
          user_agent: navigator.userAgent,
        },
      ]);

      if (insErr) throw insErr;

      setTest({ name: "", email: "", subject: "", message: "" });
      toast("Test message sent.");
      success({ title: "Message sent", message: "The test message was added to the inbox." });
      await reloadInbox();
    } catch (e) {
      setError(e.message || "Send failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteMessage = async (id) => {
    const ok = await confirm({
      title: "Delete message?",
      message: "This will permanently remove the message.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("contact_messages").delete().eq("id", id);
      if (delErr) throw delErr;

      toast("Deleted.");
      success({ title: "Message deleted", message: "The message was removed from the inbox." });
      await reloadInbox();
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = () => window.open("/#contact", "_blank");
  const openSettings = () => router.push("/admin/contact");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading inbox...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Contact Inbox</h1>
            <div className="small text-muted">Review messages sent from your contact form.</div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-outline-secondary" onClick={reloadInbox} disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-rotate me-2"></i>Refresh Inbox
                </>
              )}
            </button>
            <button className="btn btn-outline-dark" onClick={openPreview} disabled={busy}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>
            <button className="btn btn-outline-primary" onClick={openSettings} disabled={busy}>
              <i className="fa-solid fa-gear me-2"></i>Contact Settings
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
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">Send Test Message</h2>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label">Name *</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Taylor Smith"
                      value={test.name}
                      onChange={(e) => setTest((p) => ({ ...p, name: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">Use a sample name to test the contact flow.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-control"
                      placeholder="taylor@example.com"
                      value={test.email}
                      onChange={(e) => setTest((p) => ({ ...p, email: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">Use an email you can check.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Subject</label>
                    <input
                      className="form-control"
                      placeholder="Interested in your services"
                      value={test.subject}
                      onChange={(e) => setTest((p) => ({ ...p, subject: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">Optional subject line for the test message.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Message *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Write a sample inquiry to confirm messaging works."
                      value={test.message}
                      onChange={(e) => setTest((p) => ({ ...p, message: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">This will appear in the inbox list.</div>
                  </div>

                  <div className="col-12 d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={submitTest} disabled={busy}>
                      {busy ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane me-2"></i>Send Test
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">Inbox (latest 25)</h2>

                {!inbox.length ? <div className="text-muted">No messages yet.</div> : null}

                <div className="vstack gap-2">
                  {inbox.map((m) => (
                    <div key={m.id} className="border rounded p-3 bg-white">
                      <div className="d-flex justify-content-between gap-2">
                        <div>
                          <div className="fw-semibold">
                            {m.name} <span className="text-muted small">({m.email})</span>
                          </div>
                          <div className="text-muted small">{new Date(m.created_at).toLocaleString()}</div>
                          {m.subject ? (
                            <div className="small mt-1">
                              <span className="fw-semibold">Subject:</span> {m.subject}
                            </div>
                          ) : null}
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
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
