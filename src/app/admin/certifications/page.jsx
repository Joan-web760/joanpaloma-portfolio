"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const formImageUrl = useMemo(() => {
    if (!form.certificate_image_path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(form.certificate_image_path).data.publicUrl;
  }, [form.certificate_image_path]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

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

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load certifications.");
        setLoading(false);
        return;
      }

      setItems(data || []);
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

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

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

  const updateItem = async (id, patch) => {
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

      setItems((prev) => prev.map((x) => (x.id === id ? data : x)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      toast("Updated.");
    } catch (e) {
      setError(e.message || "Update failed.");
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
      toast("Deleted.");
    } catch (e) {
      setError(e.message || "Delete failed.");
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

    await Promise.all([
      updateItem(a.id, { sort_order: b.sort_order }),
      updateItem(b.id, { sort_order: a.sort_order }),
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

        {/* Add Form */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Certification</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Title *</label>
                <input className="form-control" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Provider</label>
                <input className="form-control" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Issued Date</label>
                <input className="form-control" type="date" value={form.issued_date} onChange={(e) => setForm((p) => ({ ...p, issued_date: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12">
                <label className="form-label">Verification URL</label>
                <input className="form-control" value={form.verification_url} onChange={(e) => setForm((p) => ({ ...p, verification_url: e.target.value }))} disabled={busy} />
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
                  <input className="form-check-input" type="checkbox" checked={!!form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} disabled={busy} id="newCertPub" />
                  <label className="form-check-label" htmlFor="newCertPub">Published</label>
                </div>

                <button className="btn btn-primary" onClick={createItem} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Items</h2>

            {!items.length ? <div className="text-muted">No certifications yet.</div> : null}

            <div className="vstack gap-2">
              {items.map((it) => {
                const img = it.certificate_image_path ? publicUrl(it.certificate_image_path) : "";
                return (
                  <div key={it.id} className="border rounded bg-white p-3">
                    <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                      <div className="fw-semibold">
                        {it.title}{" "}
                        {it.is_published ? <span className="badge text-bg-success ms-2">Published</span> : <span className="badge text-bg-secondary ms-2">Hidden</span>}
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
                      {it.provider ? it.provider : "—"} • {it.issued_date ? it.issued_date : "—"} • Order: {it.sort_order}
                    </div>

                    <div className="row g-2 mt-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Title</label>
                        <input className="form-control" defaultValue={it.title} onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== it.title) updateItem(it.id, { title: v });
                        }} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Provider</label>
                        <input className="form-control" defaultValue={it.provider || ""} onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (it.provider || "")) updateItem(it.id, { provider: v || null });
                        }} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Issued Date</label>
                        <input className="form-control" type="date" defaultValue={it.issued_date || ""} onBlur={(e) => updateItem(it.id, { issued_date: e.target.value || null })} disabled={busy} />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Verification URL</label>
                        <input className="form-control" defaultValue={it.verification_url || ""} onBlur={(e) => updateItem(it.id, { verification_url: e.target.value.trim() || null })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Replace Image</label>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setBusy(true);
                            setError("");
                            setNotice("");

                            try {
                              const path = await uploadCertImage(file);
                              await updateItem(it.id, { certificate_image_path: path });
                            } catch (err) {
                              setError(err.message || "Replace failed.");
                            } finally {
                              setBusy(false);
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

                      <div className="col-12 col-md-6 d-flex align-items-end">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            defaultChecked={!!it.is_published}
                            onChange={(e) => updateItem(it.id, { is_published: e.target.checked })}
                            disabled={busy}
                            id={`pub_${it.id}`}
                          />
                          <label className="form-check-label" htmlFor={`pub_${it.id}`}>Published</label>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
