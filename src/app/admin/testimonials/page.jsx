"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const emptyForm = {
  quote: "",
  name: "",
  role: "",
  company: "",
  rating: 5,
  avatar_path: null,
  is_featured: false,
  is_published: true,
};

export default function AdminTestimonialsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  // NEW: draft edits + save UX
  const [drafts, setDrafts] = useState({}); // { [id]: {quote,name,role,company,rating,is_featured,is_published} }
  const [dirtyIds, setDirtyIds] = useState(() => new Set()); // ids with unsaved changes

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/testimonials");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("testimonial_items")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load testimonials.");
        setLoading(false);
        return;
      }

      setItems(data || []);
      setDrafts({});
      setDirtyIds(new Set());
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

  const uploadAvatar = async (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
    const filename = `avatar_${crypto.randomUUID()}.${safeExt}`;
    const path = `testimonials/avatars/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("portfolio-media")
      .upload(path, file, { upsert: false });

    if (upErr) throw upErr;

    return path;
  };

  const sortFeaturedFirst = (arr) =>
    [...arr].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

  const createItem = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!form.quote.trim()) throw new Error("Quote is required.");
      if (!form.name.trim()) throw new Error("Name is required.");

      const rating = Number(form.rating);
      if (Number.isNaN(rating) || rating < 1 || rating > 5) throw new Error("Rating must be 1–5.");

      const maxOrder = items.length ? Math.max(...items.map((x) => x.sort_order || 0)) : 0;

      const payload = {
        quote: form.quote.trim(),
        name: form.name.trim(),
        role: form.role.trim() || null,
        company: form.company.trim() || null,
        rating,
        avatar_path: form.avatar_path || null,
        is_featured: !!form.is_featured,
        is_published: !!form.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("testimonial_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      setItems((prev) => sortFeaturedFirst([...prev, data]));
      setForm(emptyForm);
      toast("Testimonial added.");
    } catch (e) {
      setError(e.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  // NEW: stage edits locally (no autosave)
  const stage = (id, patch) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const getDraftValue = (it, key) => {
    if (drafts[it.id] && Object.prototype.hasOwnProperty.call(drafts[it.id], key)) return drafts[it.id][key];
    return it[key];
  };

  // NEW: save all staged changes
  const saveChanges = async () => {
    const ids = Array.from(dirtyIds);
    if (!ids.length) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // build updates; ignore empty drafts defensively
      const updates = ids
        .map((id) => ({ id, patch: drafts[id] || null }))
        .filter((x) => x.patch && Object.keys(x.patch).length);

      if (!updates.length) {
        setDirtyIds(new Set());
        setDrafts({});
        toast("No changes to save.");
        return;
      }

      // validate a bit
      for (const u of updates) {
        if (u.patch.rating != null) {
          const r = Number(u.patch.rating);
          if (Number.isNaN(r) || r < 1 || r > 5) throw new Error("Rating must be 1–5.");
          u.patch.rating = r;
        }
        if (u.patch.quote != null) u.patch.quote = String(u.patch.quote).trim();
        if (u.patch.name != null) u.patch.name = String(u.patch.name).trim();
        if (u.patch.role != null) u.patch.role = String(u.patch.role).trim() || null;
        if (u.patch.company != null) u.patch.company = String(u.patch.company).trim() || null;

        if (u.patch.quote === "") throw new Error("Quote cannot be empty.");
        if (u.patch.name === "") throw new Error("Name cannot be empty.");
      }

      // execute updates (parallel)
      const results = await Promise.all(
        updates.map((u) =>
          supabase.from("testimonial_items").update(u.patch).eq("id", u.id).select("*").single()
        )
      );

      const updatedRows = [];
      for (const res of results) {
        if (res.error) throw res.error;
        updatedRows.push(res.data);
      }

      // merge updates into items
      setItems((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        for (const row of updatedRows) map.set(row.id, row);
        return sortFeaturedFirst(Array.from(map.values()));
      });

      // clear drafts for saved ids
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      setDirtyIds(new Set());

      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  // NEW: discard staged edits
  const discardChanges = () => {
    setDrafts({});
    setDirtyIds(new Set());
    toast("Discarded changes.");
  };

  const updateItem = async (id, patch) => {
    // still used for immediate operations (avatar replace, move)
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("testimonial_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setItems((prev) =>
        sortFeaturedFirst(prev.map((x) => (x.id === id ? data : x)))
      );

      // if there was a staged draft for this id, keep it but reflect possible server changes
      toast("Updated.");
    } catch (e) {
      setError(e.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this testimonial?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("testimonial_items").delete().eq("id", id);
      if (delErr) throw delErr;

      setItems((prev) => prev.filter((x) => x.id !== id));

      // cleanup drafts
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

    // immediate
    await Promise.all([
      updateItem(a.id, { sort_order: b.sort_order }),
      updateItem(b.id, { sort_order: a.sort_order }),
    ]);
  };

  const openPreview = () => window.open("/#testimonials", "_blank");

  const dirtyCount = dirtyIds.size;

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Testimonials editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Testimonials</h1>
            <div className="small text-muted">Social proof with ratings, featured picks, avatars, ordering.</div>
          </div>

          <div className="d-flex gap-2 align-items-center">
            {/* NEW: Save Bar */}
            <div className="d-flex gap-2 align-items-center">
              <span className={`badge ${dirtyCount ? "text-bg-warning" : "text-bg-secondary"}`}>
                {dirtyCount ? `${dirtyCount} unsaved` : "No pending changes"}
              </span>

              <button
                className="btn btn-success"
                onClick={saveChanges}
                disabled={busy || !dirtyCount}
                title={dirtyCount ? "Save all staged changes" : "No changes"}
              >
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

              <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !dirtyCount}>
                <i className="fa-solid fa-rotate-left me-2"></i>Discard
              </button>
            </div>

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
            <h2 className="h6 mb-3">Add Testimonial</h2>

            <div className="row g-2">
              <div className="col-12">
                <label className="form-label">Quote *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={form.quote}
                  onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))}
                  disabled={busy}
                />
              </div>

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
                <label className="form-label">Role</label>
                <input
                  className="form-control"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Company</label>
                <input
                  className="form-control"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Rating</label>
                <select
                  className="form-select"
                  value={form.rating}
                  onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                  disabled={busy}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-5">
                <label className="form-label">Avatar (optional)</label>
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
                      const path = await uploadAvatar(file);
                      setForm((p) => ({ ...p, avatar_path: path }));
                      toast("Avatar uploaded (will save on Add).");
                    } catch (err) {
                      setError(err.message || "Upload failed.");
                    } finally {
                      setBusy(false);
                      e.target.value = "";
                    }
                  }}
                />
                {form.avatar_path ? (
                  <div className="small text-muted mt-1">
                    Path: <code>{form.avatar_path}</code>
                  </div>
                ) : null}
              </div>

              <div className="col-12 col-md-4 d-flex align-items-end justify-content-between">
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

            {!items.length ? <div className="text-muted">No testimonials yet.</div> : null}

            <div className="vstack gap-2">
              {items.map((it) => {
                const img = it.avatar_path ? publicUrl(it.avatar_path) : "";
                const meta = [it.role, it.company].filter(Boolean).join(" • ");
                const isDirty = dirtyIds.has(it.id);

                const quoteVal = getDraftValue(it, "quote") ?? "";
                const nameVal = getDraftValue(it, "name") ?? "";
                const roleVal = getDraftValue(it, "role") ?? "";
                const companyVal = getDraftValue(it, "company") ?? "";
                const ratingVal = getDraftValue(it, "rating") ?? 5;
                const featuredVal = !!getDraftValue(it, "is_featured");
                const publishedVal = !!getDraftValue(it, "is_published");

                return (
                  <div key={it.id} className={`border rounded bg-white p-3 ${isDirty ? "border-warning" : ""}`}>
                    <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                      <div className="d-flex gap-3 align-items-start">
                        <div
                          className="rounded-circle border bg-light overflow-hidden d-flex align-items-center justify-content-center"
                          style={{ width: 56, height: 56 }}
                        >
                          {img ? (
                            <img src={img} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <i className="fa-solid fa-user text-muted"></i>
                          )}
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {it.name}
                            {it.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
                            {it.is_published ? (
                              <span className="badge text-bg-success ms-2">Published</span>
                            ) : (
                              <span className="badge text-bg-secondary ms-2">Hidden</span>
                            )}
                            {isDirty ? <span className="badge text-bg-warning ms-2">Unsaved</span> : null}
                          </div>
                          <div className="text-muted small">{meta || "—"}</div>
                          <div className="text-muted small">Order: {it.sort_order}</div>
                        </div>
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

                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <label className="form-label">Quote</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={quoteVal}
                          onChange={(e) => stage(it.id, { quote: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Name</label>
                        <input
                          className="form-control"
                          value={nameVal}
                          onChange={(e) => stage(it.id, { name: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Role</label>
                        <input
                          className="form-control"
                          value={roleVal || ""}
                          onChange={(e) => stage(it.id, { role: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Company</label>
                        <input
                          className="form-control"
                          value={companyVal || ""}
                          onChange={(e) => stage(it.id, { company: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Rating</label>
                        <select
                          className="form-select"
                          value={Number(ratingVal) || 5}
                          onChange={(e) => stage(it.id, { rating: Number(e.target.value) })}
                          disabled={busy}
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Replace Avatar</label>
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
                              const path = await uploadAvatar(file);

                              // Optional: remove old avatar
                              if (it.avatar_path) {
                                await supabase.storage.from("portfolio-media").remove([it.avatar_path]);
                              }

                              await updateItem(it.id, { avatar_path: path }); // immediate
                            } catch (err) {
                              setError(err.message || "Replace failed.");
                            } finally {
                              setBusy(false);
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>

                      <div className="col-12 col-md-6 d-flex align-items-end">
                        <div className="d-flex gap-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={featuredVal}
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
                              checked={publishedVal}
                              onChange={(e) => stage(it.id, { is_published: e.target.checked })}
                              disabled={busy}
                              id={`pub_${it.id}`}
                            />
                            <label className="form-check-label" htmlFor={`pub_${it.id}`}>
                              Published
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* optional bottom save bar */}
            <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center mt-3">
              <span className={`badge ${dirtyCount ? "text-bg-warning" : "text-bg-secondary"}`}>
                {dirtyCount ? `${dirtyCount} unsaved` : "No pending changes"}
              </span>
              <button className="btn btn-success" onClick={saveChanges} disabled={busy || !dirtyCount}>
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
              <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || !dirtyCount}>
                <i className="fa-solid fa-rotate-left me-2"></i>Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
