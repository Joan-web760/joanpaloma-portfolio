"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const emptyForm = {
  name: "",
  price: "",
  billing_type: "",
  description: "",
  inclusionsText: "",
  addonsText: "",
  is_featured: false,
  is_published: true,
};

const toLines = (text) =>
  (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const fromArr = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean)
    .join("\n");

export default function AdminPricingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/pricing");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("package_items")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load packages.");
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

  const createItem = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!form.name.trim()) throw new Error("Package name is required.");

      const maxOrder = items.length ? Math.max(...items.map((x) => x.sort_order || 0)) : 0;

      const payload = {
        name: form.name.trim(),
        price: form.price.trim() || null,
        billing_type: form.billing_type.trim() || null,
        description: form.description.trim() || null,
        inclusions: toLines(form.inclusionsText),
        addons: toLines(form.addonsText),
        is_featured: !!form.is_featured,
        is_published: !!form.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("package_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      setItems((prev) =>
        [...prev, data].sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
          return (a.sort_order || 0) - (b.sort_order || 0);
        })
      );
      setForm(emptyForm);
      toast("Package added.");
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
        .from("package_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setItems((prev) =>
        prev
          .map((x) => (x.id === id ? data : x))
          .sort((a, b) => {
            if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
            return (a.sort_order || 0) - (b.sort_order || 0);
          })
      );
      toast("Updated.");
    } catch (e) {
      setError(e.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this package?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("package_items").delete().eq("id", id);
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

  const openPreview = () => window.open("/#pricing", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Pricing editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Pricing & Packages</h1>
            <div className="small text-muted">Manage packages, inclusions, add-ons, featured, ordering.</div>
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

        {/* Add */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Package</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Name *</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Price</label>
                <input className="form-control" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Billing Type</label>
                <input className="form-control" value={form.billing_type} onChange={(e) => setForm((p) => ({ ...p, billing_type: e.target.value }))} disabled={busy} placeholder="per month / per project" />
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Inclusions (one per line)</label>
                <textarea className="form-control" rows="6" value={form.inclusionsText} onChange={(e) => setForm((p) => ({ ...p, inclusionsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Add-ons (one per line)</label>
                <textarea className="form-control" rows="6" value={form.addonsText} onChange={(e) => setForm((p) => ({ ...p, addonsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 d-flex flex-wrap gap-3 align-items-center justify-content-between mt-2">
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))} disabled={busy} id="newFeat" />
                    <label className="form-check-label" htmlFor="newFeat">Featured</label>
                  </div>

                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" checked={!!form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} disabled={busy} id="newPub" />
                    <label className="form-check-label" htmlFor="newPub">Published</label>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={createItem} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add Package
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Packages</h2>

            {!items.length ? <div className="text-muted">No packages yet.</div> : null}

            <div className="vstack gap-2">
              {items.map((it) => (
                <div key={it.id} className="border rounded bg-white p-3">
                  <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                    <div className="fw-semibold">
                      {it.name}{" "}
                      {it.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
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

                  <div className="text-muted small">Order: {it.sort_order}</div>

                  <div className="row g-2 mt-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Name</label>
                      <input className="form-control" defaultValue={it.name} onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== it.name) updateItem(it.id, { name: v });
                      }} disabled={busy} />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Price</label>
                      <input className="form-control" defaultValue={it.price || ""} onBlur={(e) => updateItem(it.id, { price: e.target.value.trim() || null })} disabled={busy} />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Billing Type</label>
                      <input className="form-control" defaultValue={it.billing_type || ""} onBlur={(e) => updateItem(it.id, { billing_type: e.target.value.trim() || null })} disabled={busy} />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows="2" defaultValue={it.description || ""} onBlur={(e) => updateItem(it.id, { description: e.target.value.trim() || null })} disabled={busy} />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Inclusions</label>
                      <textarea className="form-control" rows="6" defaultValue={fromArr(it.inclusions)} onBlur={(e) => updateItem(it.id, { inclusions: toLines(e.target.value) })} disabled={busy} />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Add-ons</label>
                      <textarea className="form-control" rows="6" defaultValue={fromArr(it.addons)} onBlur={(e) => updateItem(it.id, { addons: toLines(e.target.value) })} disabled={busy} />
                    </div>

                    <div className="col-12 d-flex flex-wrap gap-3 align-items-center">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" defaultChecked={!!it.is_featured} onChange={(e) => updateItem(it.id, { is_featured: e.target.checked })} disabled={busy} id={`feat_${it.id}`} />
                        <label className="form-check-label" htmlFor={`feat_${it.id}`}>Featured</label>
                      </div>

                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" defaultChecked={!!it.is_published} onChange={(e) => updateItem(it.id, { is_published: e.target.checked })} disabled={busy} id={`pub_${it.id}`} />
                        <label className="form-check-label" htmlFor={`pub_${it.id}`}>Published</label>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
