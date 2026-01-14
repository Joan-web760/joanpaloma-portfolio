// src/app/admin/certifications/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const emptyForm = {
  title: "",
  provider: "",
  issued_date: "",
  verification_url: "",
  certificate_image_path: null,
  is_published: true,
};

export default function AdminCertificationsPage() {
  const router = useRouter();

  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  // Draft edits for existing items (local/staged)
  const [drafts, setDrafts] = useState({}); // { [id]: partial }
  const [saving, setSaving] = useState(false);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => {
      if (mountedRef.current) setNotice("");
    }, 2000);
  };

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  const formImageUrl = useMemo(() => publicUrl(form.certificate_image_path), [form.certificate_image_path]);

  const hasPendingChanges = useMemo(() => Object.keys(drafts).length > 0, [drafts]);

  const onEdit = (id, patch) => {
    setDrafts((prev) => {
      const next = { ...(prev || {}) };
      next[id] = { ...(next[id] || {}), ...(patch || {}) };

      // remove empty draft object if nothing inside
      if (!next[id] || Object.keys(next[id]).length === 0) delete next[id];
      return next;
    });
  };

  const getValue = (it, key) => {
    const d = drafts[it.id];
    return d && key in d ? d[key] : it[key];
  };

  const discardChanges = () => {
    setDrafts({});
    toast("Changes discarded.");
  };

  const load = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      router.replace("/admin/login?next=/admin/certifications");
      return;
    }

    const { data, error: dbErr } = await supabase
      .from("certification_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("issued_date", { ascending: false })
      .order("created_at", { ascending: true });

    if (!mountedRef.current) return;

    if (dbErr) {
      setError(dbErr.message || "Failed to load certifications.");
      setLoading(false);
      return;
    }

    setItems(data || []);
    setDrafts({});
    setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const uploadCertImage = async (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
    const filename = `${crypto.randomUUID()}.${safeExt}`;
    const path = `certifications/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("portfolio-media")
      .upload(path, file, { upsert: false });

    if (upErr) throw upErr;
    return path;
  };

  const createItem = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!form.title.trim()) throw new Error("Title is required.");

      const maxOrder = items.length ? Math.max(...items.map((x) => x.sort_order || 0)) : 0;

      const payload = {
        title: form.title.trim(),
        provider: form.provider.trim() || null,
        issued_date: form.issued_date || null,
        verification_url: form.verification_url.trim() || null,
        certificate_image_path: form.certificate_image_path || null,
        is_published: !!form.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("certification_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      setItems((prev) => [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setForm(emptyForm);
      toast("Certification added.");
    } catch (e) {
      setError(e.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this certification?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("certification_items").delete().eq("id", id);
      if (delErr) throw delErr;

      setItems((prev) => prev.filter((x) => x.id !== id));
      setDrafts((prev) => {
        const next = { ...(prev || {}) };
        delete next[id];
        return next;
      });
      toast("Deleted.");
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateItemImmediate = async (id, patch) => {
    // used for move + image replace (still immediate)
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("certification_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setItems((prev) =>
        prev
          .map((x) => (x.id === id ? data : x))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );

      // if that field is also in drafts, remove it so UI stays clean
      setDrafts((prev) => {
        const next = { ...(prev || {}) };
        if (!next[id]) return next;

        const cleaned = { ...next[id] };
        for (const k of Object.keys(patch || {})) delete cleaned[k];

        if (Object.keys(cleaned).length === 0) delete next[id];
        else next[id] = cleaned;

        return next;
      });

      toast("Updated.");
    } catch (e) {
      setError(e.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveItem = async (id, dir) => {
    const idx = items.findIndex((x) => x.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= items.length) return;

    const a = items[idx];
    const b = items[swapWith];

    // immediate save
    await Promise.all([
      updateItemImmediate(a.id, { sort_order: b.sort_order }),
      updateItemImmediate(b.id, { sort_order: a.sort_order }),
    ]);
  };

  const onFormImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadCertImage(file);
      setForm((p) => ({ ...p, certificate_image_path: path }));
      toast("Image uploaded. Click Add to save record.");
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const replaceItemImageImmediate = async (id, file) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadCertImage(file);
      await updateItemImmediate(id, { certificate_image_path: path });
    } catch (err) {
      setError(err.message || "Replace failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!hasPendingChanges) return;

    setSaving(true);
    setBusy(true);
    setError("");
    setNotice("");

    try {
      // Build a list of updates; only send fields that exist in draft
      const updates = Object.entries(drafts).map(([id, patch]) => ({
        id,
        patch,
      }));

      // Optional: client-side validation (title required if provided/emptied)
      for (const u of updates) {
        if ("title" in u.patch) {
          const v = (u.patch.title || "").trim();
          if (!v) throw new Error("Title cannot be empty.");
          u.patch.title = v;
        }
        if ("provider" in u.patch) {
          const v = (u.patch.provider || "").trim();
          u.patch.provider = v || null;
        }
        if ("verification_url" in u.patch) {
          const v = (u.patch.verification_url || "").trim();
          u.patch.verification_url = v || null;
        }
        if ("issued_date" in u.patch) {
          u.patch.issued_date = u.patch.issued_date || null;
        }
        if ("is_published" in u.patch) {
          u.patch.is_published = !!u.patch.is_published;
        }
      }

      // Execute updates (parallel)
      const results = await Promise.all(
        updates.map(({ id, patch }) =>
          supabase.from("certification_items").update(patch).eq("id", id).select("*").single()
        )
      );

      // Check errors
      for (const r of results) {
        if (r.error) throw r.error;
      }

      // Merge returned rows back into items
      const updatedRows = results.map((r) => r.data).filter(Boolean);
      setItems((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        for (const row of updatedRows) map.set(row.id, row);
        return Array.from(map.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });

      setDrafts({});
      toast("Saved changes.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
      setBusy(false);
    }
  };

  const openPreview = () => window.open("/#certifications", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Certifications editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Certifications</h1>
            <div className="small text-muted">Add/edit certificates with proof image and verification link.</div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreview} disabled={busy}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>

            {/* SAVE BUTTON (existing items edits) */}
            <button
              className={`btn ${hasPendingChanges ? "btn-success" : "btn-outline-success"}`}
              onClick={saveChanges}
              disabled={busy || !hasPendingChanges}
              title={hasPendingChanges ? "Save staged changes" : "No changes to save"}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-2"></i>
                  Save Changes
                  {hasPendingChanges ? <span className="badge text-bg-light text-dark ms-2">{Object.keys(drafts).length}</span> : null}
                </>
              )}
            </button>

            <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !hasPendingChanges}>
              <i className="fa-solid fa-rotate-left me-2"></i>Discard
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

        {/* Add Form */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Certification</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Title *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Provider</label>
                <input
                  className="form-control"
                  value={form.provider}
                  onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Issued Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.issued_date}
                  onChange={(e) => setForm((p) => ({ ...p, issued_date: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Verification URL</label>
                <input
                  className="form-control"
                  value={form.verification_url}
                  onChange={(e) => setForm((p) => ({ ...p, verification_url: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Certificate Image (optional)</label>
                <input className="form-control" type="file" accept="image/*" onChange={onFormImageChange} disabled={busy} />
                {formImageUrl ? (
                  <div className="mt-2">
                    <img src={formImageUrl} alt="Certificate preview" className="img-fluid rounded border" />
                    <div className="small text-muted mt-1">
                      Path: <code>{form.certificate_image_path}</code>
                    </div>
                  </div>
                ) : (
                  <div className="small text-muted mt-2">No image selected.</div>
                )}
              </div>

              <div className="col-12 col-md-6 d-flex align-items-end justify-content-between">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!form.is_published}
                    onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                    disabled={busy}
                    id="newCertPub"
                  />
                  <label className="form-check-label" htmlFor="newCertPub">
                    Published
                  </label>
                </div>

                <button className="btn btn-primary" onClick={createItem} disabled={busy}>
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Working...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus me-2"></i>Add
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
              <h2 className="h6 mb-0">Items</h2>

              {hasPendingChanges ? (
                <div className="small text-muted">
                  <i className="fa-solid fa-circle-info me-2"></i>
                  You have unsaved changes.
                </div>
              ) : (
                <div className="small text-muted">All changes saved.</div>
              )}
            </div>

            {!items.length ? <div className="text-muted">No certifications yet.</div> : null}

            <div className="vstack gap-2">
              {items.map((it) => {
                const img = it.certificate_image_path ? publicUrl(it.certificate_image_path) : "";

                const titleVal = getValue(it, "title") || "";
                const providerVal = getValue(it, "provider") || "";
                const issuedVal = getValue(it, "issued_date") || "";
                const verifyVal = getValue(it, "verification_url") || "";
                const pubVal = !!getValue(it, "is_published");

                const isDirty = !!drafts[it.id];

                return (
                  <div key={it.id} className={`border rounded bg-white p-3 ${isDirty ? "border-success" : ""}`}>
                    <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                      <div className="fw-semibold">
                        {it.title}{" "}
                        {pubVal ? (
                          <span className="badge text-bg-success ms-2">Published</span>
                        ) : (
                          <span className="badge text-bg-secondary ms-2">Hidden</span>
                        )}
                        {isDirty ? <span className="badge text-bg-warning text-dark ms-2">Unsaved</span> : null}
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveItem(it.id, "up")} disabled={busy}>
                          <i className="fa-solid fa-arrow-up"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveItem(it.id, "down")} disabled={busy}>
                          <i className="fa-solid fa-arrow-down"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteItem(it.id)} disabled={busy}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div className="text-muted small">
                      {(providerVal || "—") + " • " + (issuedVal || "—") + " • Order: " + it.sort_order}
                    </div>

                    <div className="row g-2 mt-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Title</label>
                        <input
                          className="form-control"
                          value={titleVal}
                          onChange={(e) => onEdit(it.id, { title: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Provider</label>
                        <input
                          className="form-control"
                          value={providerVal}
                          onChange={(e) => onEdit(it.id, { provider: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Issued Date</label>
                        <input
                          className="form-control"
                          type="date"
                          value={issuedVal || ""}
                          onChange={(e) => onEdit(it.id, { issued_date: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Verification URL</label>
                        <input
                          className="form-control"
                          value={verifyVal}
                          onChange={(e) => onEdit(it.id, { verification_url: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Replace Image (saves immediately)</label>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            try {
                              await replaceItemImageImmediate(it.id, file);
                            } finally {
                              e.target.value = "";
                            }
                          }}
                        />

                        {img ? (
                          <div className="mt-2">
                            <img src={img} alt={it.title} className="img-fluid rounded border" />
                          </div>
                        ) : (
                          <div className="small text-muted mt-2">No image.</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6 d-flex align-items-end justify-content-between">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={pubVal}
                            onChange={(e) => onEdit(it.id, { is_published: e.target.checked })}
                            disabled={busy}
                            id={`pub_${it.id}`}
                          />
                          <label className="form-check-label" htmlFor={`pub_${it.id}`}>
                            Published
                          </label>
                        </div>

                        {isDirty ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => {
                              // save just this row
                              const patch = drafts[it.id];
                              if (!patch) return;
                              setDrafts((prev) => {
                                const next = { ...(prev || {}) };
                                // keep in drafts until save finishes (UX: show saving spinner? kept simple)
                                return next;
                              });
                              // Reuse saveChanges logic for single row:
                              (async () => {
                                setSaving(true);
                                setBusy(true);
                                setError("");
                                setNotice("");
                                try {
                                  const clean = { ...patch };
                                  if ("title" in clean) {
                                    const v = (clean.title || "").trim();
                                    if (!v) throw new Error("Title cannot be empty.");
                                    clean.title = v;
                                  }
                                  if ("provider" in clean) clean.provider = (clean.provider || "").trim() || null;
                                  if ("verification_url" in clean) clean.verification_url = (clean.verification_url || "").trim() || null;
                                  if ("issued_date" in clean) clean.issued_date = clean.issued_date || null;
                                  if ("is_published" in clean) clean.is_published = !!clean.is_published;

                                  const { data, error } = await supabase
                                    .from("certification_items")
                                    .update(clean)
                                    .eq("id", it.id)
                                    .select("*")
                                    .single();

                                  if (error) throw error;

                                  setItems((prev) =>
                                    prev
                                      .map((x) => (x.id === it.id ? data : x))
                                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                  );

                                  setDrafts((prev) => {
                                    const next = { ...(prev || {}) };
                                    delete next[it.id];
                                    return next;
                                  });

                                  toast("Saved.");
                                } catch (e) {
                                  setError(e.message || "Save failed.");
                                } finally {
                                  setSaving(false);
                                  setBusy(false);
                                }
                              })();
                            }}
                            disabled={busy}
                          >
                            <i className="fa-solid fa-floppy-disk me-2"></i>Save Row
                          </button>
                        ) : (
                          <span className="small text-muted">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Save bar */}
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mt-3 pt-3 border-top">
              <div className="small text-muted">
                {hasPendingChanges ? (
                  <>
                    <i className="fa-solid fa-pen-to-square me-2"></i>
                    {Object.keys(drafts).length} item(s) have unsaved edits.
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check me-2"></i>
                    No pending edits.
                  </>
                )}
              </div>

              <div className="d-flex gap-2">
                <button
                  className={`btn ${hasPendingChanges ? "btn-success" : "btn-outline-success"}`}
                  onClick={saveChanges}
                  disabled={busy || !hasPendingChanges}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk me-2"></i>Save Changes
                    </>
                  )}
                </button>

                <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !hasPendingChanges}>
                  <i className="fa-solid fa-rotate-left me-2"></i>Discard
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
