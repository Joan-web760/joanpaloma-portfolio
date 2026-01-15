"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const sortPackages = (list) =>
  [...(list || [])].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

export default function AdminPricingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // Busy is now only for network ops (create/delete/move/save)
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  /**
   * Save button UX for inline edits:
   * - items: last loaded/saved state
   * - drafts: local staged edits (do not persist until Save Changes)
   */
  const [drafts, setDrafts] = useState({});
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
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

      setItems(sortPackages(data || []));
      setDrafts({});
      setDirtyIds(new Set());
      setSavingIds(new Set());
      setLoading(false);
    })();

    return () => {
      alive = false;
      mountedRef.current = false;
    };
  }, [router]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => {
      if (mountedRef.current) setNotice("");
    }, 2000);
  };

  const openPreview = () => window.open("/#pricing", "_blank");

  const stagedCount = useMemo(() => dirtyIds.size, [dirtyIds]);

  const getDraft = (it) => drafts[it.id] || {};

  const stage = (id, patch) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const discardChanges = () => {
    setDrafts({});
    setDirtyIds(new Set());
    toast("Changes discarded.");
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

      setItems((prev) => sortPackages([...(prev || []), data]));
      setForm(emptyForm);
      toast("Package added.");
    } catch (e) {
      setError(e.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  // Used by move (immediate save) and by Save Changes (batch save)
  const updateItemImmediate = async (id, patch) => {
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

      setItems((prev) => sortPackages(prev.map((x) => (x.id === id ? data : x))));
      toast("Updated.");
      return data;
    } catch (e) {
      setError(e.message || "Update failed.");
      throw e;
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

      // cleanup any staged edits
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

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

    // keep move immediate (no staging)
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data: aRes, error: e1 } = await supabase
        .from("package_items")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id)
        .select("*")
        .single();
      if (e1) throw e1;

      const { data: bRes, error: e2 } = await supabase
        .from("package_items")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id)
        .select("*")
        .single();
      if (e2) throw e2;

      setItems((prev) => sortPackages(prev.map((x) => (x.id === a.id ? aRes : x.id === b.id ? bRes : x))));
      toast("Order updated.");
    } catch (e) {
      setError(e.message || "Move failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!dirtyIds.size) return;

    setBusy(true);
    setError("");
    setNotice("");

    const ids = Array.from(dirtyIds);

    // show saving state per row
    setSavingIds(() => new Set(ids));

    try {
      // build patches from drafts (and normalize types)
      const patches = ids.map((id) => {
        const d = drafts[id] || {};
        // Only send columns that are present in draft
        const patch = {};
        if ("name" in d) patch.name = d.name.trim();
        if ("price" in d) patch.price = d.price.trim() || null;
        if ("billing_type" in d) patch.billing_type = d.billing_type.trim() || null;
        if ("description" in d) patch.description = d.description.trim() || null;
        if ("inclusionsText" in d) patch.inclusions = toLines(d.inclusionsText);
        if ("addonsText" in d) patch.addons = toLines(d.addonsText);
        if ("is_featured" in d) patch.is_featured = !!d.is_featured;
        if ("is_published" in d) patch.is_published = !!d.is_published;
        return { id, patch };
      });

      // validate a bit (name cannot be blank if edited)
      for (const { id, patch } of patches) {
        if ("name" in patch && !patch.name) {
          throw new Error("Name cannot be empty. Please fix the highlighted item and try again.");
        }
      }

      // execute updates sequentially to keep UI predictable (and easier error handling)
      const updatedRows = [];
      for (const { id, patch } of patches) {
        const { data, error: updErr } = await supabase
          .from("package_items")
          .update(patch)
          .eq("id", id)
          .select("*")
          .single();

        if (updErr) throw updErr;
        updatedRows.push(data);
      }

      // merge updated rows into items
      setItems((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        for (const row of updatedRows) map.set(row.id, row);
        return sortPackages(Array.from(map.values()));
      });

      // clear staged state
      setDrafts({});
      setDirtyIds(new Set());
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSavingIds(new Set());
      setBusy(false);
    }
  };

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

          <div className="d-flex flex-wrap gap-2 align-items-center">
            {stagedCount ? (
              <span className="badge text-bg-primary">
                {stagedCount} change{stagedCount > 1 ? "s" : ""} not saved
              </span>
            ) : (
              <span className="badge text-bg-success">All changes saved</span>
            )}

            <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !stagedCount}>
              <i className="fa-solid fa-rotate-left me-2"></i>Discard
            </button>

            <button className="btn btn-success" onClick={saveChanges} disabled={busy || !stagedCount}>
              {busy ? (
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

            <button className="btn btn-outline-dark" onClick={openPreview} disabled={busy}>
              <i className="fa-solid fa-eye me-2"></i>Preview
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

        {/* Add */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Package</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Name *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Price</label>
                <input
                  className="form-control"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Billing Type</label>
                <input
                  className="form-control"
                  value={form.billing_type}
                  onChange={(e) => setForm((p) => ({ ...p, billing_type: e.target.value }))}
                  disabled={busy}
                  placeholder="per month / per project"
                />
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Inclusions (one per line)</label>
                <textarea
                  className="form-control"
                  rows="6"
                  value={form.inclusionsText}
                  onChange={(e) => setForm((p) => ({ ...p, inclusionsText: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Add-ons (one per line)</label>
                <textarea
                  className="form-control"
                  rows="6"
                  value={form.addonsText}
                  onChange={(e) => setForm((p) => ({ ...p, addonsText: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 d-flex flex-wrap gap-3 align-items-center justify-content-between mt-2">
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!form.is_featured}
                      onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))}
                      disabled={busy}
                      id="newFeat"
                    />
                    <label className="form-check-label" htmlFor="newFeat">
                      Featured
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!form.is_published}
                      onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                      disabled={busy}
                      id="newPub"
                    />
                    <label className="form-check-label" htmlFor="newPub">
                      Published
                    </label>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={createItem} disabled={busy}>
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Working...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus me-2"></i>Add Package
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
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="h6 mb-0">Packages</h2>

              {stagedCount ? (
                <div className="small text-muted">
                  Tip: edit fields, then click <span className="fw-semibold">Save Changes</span>
                </div>
              ) : null}
            </div>

            {!items.length ? <div className="text-muted">No packages yet.</div> : null}

            <div className="vstack gap-2">
              {items.map((it) => {
                const d = getDraft(it);
                const isDirty = dirtyIds.has(it.id);
                const isSaving = savingIds.has(it.id);

                const nameVal = "name" in d ? d.name : it.name || "";
                const priceVal = "price" in d ? d.price : it.price || "";
                const billingVal = "billing_type" in d ? d.billing_type : it.billing_type || "";
                const descVal = "description" in d ? d.description : it.description || "";
                const incText = "inclusionsText" in d ? d.inclusionsText : fromArr(it.inclusions);
                const addText = "addonsText" in d ? d.addonsText : fromArr(it.addons);
                const featVal = "is_featured" in d ? !!d.is_featured : !!it.is_featured;
                const pubVal = "is_published" in d ? !!d.is_published : !!it.is_published;

                return (
                  <div key={it.id} className={`border rounded bg-white p-3 ${isDirty ? "border-primary" : ""}`}>
                    <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                      <div className="fw-semibold">
                        {it.name}{" "}
                        {it.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
                        {it.is_published ? (
                          <span className="badge text-bg-success ms-2">Published</span>
                        ) : (
                          <span className="badge text-bg-secondary ms-2">Hidden</span>
                        )}

                        {isDirty ? <span className="badge text-bg-primary ms-2">Edited</span> : null}
                        {isSaving ? <span className="badge text-bg-secondary ms-2">Saving…</span> : null}
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => moveItem(it.id, "up")}
                          disabled={busy}
                          title="Move up"
                        >
                          <i className="fa-solid fa-arrow-up"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => moveItem(it.id, "down")}
                          disabled={busy}
                          title="Move down"
                        >
                          <i className="fa-solid fa-arrow-down"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteItem(it.id)}
                          disabled={busy}
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div className="text-muted small">Order: {it.sort_order}</div>

                    <div className="row g-2 mt-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Name</label>
                        <input
                          className="form-control"
                          value={nameVal}
                          onChange={(e) => stage(it.id, { name: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Price</label>
                        <input
                          className="form-control"
                          value={priceVal}
                          onChange={(e) => stage(it.id, { price: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Billing Type</label>
                        <input
                          className="form-control"
                          value={billingVal}
                          onChange={(e) => stage(it.id, { billing_type: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={descVal}
                          onChange={(e) => stage(it.id, { description: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Inclusions</label>
                        <textarea
                          className="form-control"
                          rows="6"
                          value={incText}
                          onChange={(e) => stage(it.id, { inclusionsText: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Add-ons</label>
                        <textarea
                          className="form-control"
                          rows="6"
                          value={addText}
                          onChange={(e) => stage(it.id, { addonsText: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 d-flex flex-wrap gap-3 align-items-center">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={featVal}
                            onChange={(e) => stage(it.id, { is_featured: e.target.checked })}
                            disabled={busy}
                            id={`feat_${it.id}`}
                          />
                          <label className="form-check-label" htmlFor={`feat_${it.id}`}>
                            Featured
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={pubVal}
                            onChange={(e) => stage(it.id, { is_published: e.target.checked })}
                            disabled={busy}
                            id={`pub_${it.id}`}
                          />
                          <label className="form-check-label" htmlFor={`pub_${it.id}`}>
                            Published
                          </label>
                        </div>

                        {isDirty ? (
                          <button
                            className="btn btn-sm btn-outline-secondary ms-auto"
                            disabled={busy}
                            onClick={() => {
                              // discard just this row
                              setDrafts((prev) => {
                                const next = { ...prev };
                                delete next[it.id];
                                return next;
                              });
                              setDirtyIds((prev) => {
                                const next = new Set(prev);
                                next.delete(it.id);
                                return next;
                              });
                              toast("Row discarded.");
                            }}
                          >
                            Discard row
                          </button>
                        ) : null}
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
