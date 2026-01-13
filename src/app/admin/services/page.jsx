// src/app/admin/services/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const emptyCategory = { title: "", description: "", is_published: true };
const emptyService = { title: "", description: "", bulletsText: "", is_published: true };

export default function AdminServicesPage() {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  // React-controlled accordion (fix)
  const [openCatId, setOpenCatId] = useState(null);

  // Create forms
  const [newCat, setNewCat] = useState(emptyCategory);
  const [newItem, setNewItem] = useState({ ...emptyService, category_id: "" });

  const toKey = (v) => String(v ?? "");

  const itemsByCategory = useMemo(() => {
    const map = {};
    for (const c of categories) map[toKey(c.id)] = [];
    for (const it of items) {
      const k = toKey(it.category_id);
      if (!map[k]) map[k] = [];
      map[k].push(it);
    }
    return map;
  }, [categories, items]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);
      setError("");
      setNotice("");

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/services");
        return;
      }

      await reloadAll();
      if (mountedRef.current) setLoading(false);
    })();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const reloadAll = async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase
        .from("service_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("service_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (!mountedRef.current) return;

    if (catRes.error) {
      setError(catRes.error.message || "Failed to load categories.");
      return;
    }

    if (itemRes.error) {
      setError(itemRes.error.message || "Failed to load services.");
      return;
    }

    const nextCats = catRes.data || [];
    const nextItems = itemRes.data || [];

    setCategories(nextCats);
    setItems(nextItems);

    // keep accordion state valid
    if (openCatId) {
      const exists = nextCats.some((c) => toKey(c.id) === toKey(openCatId));
      if (!exists) setOpenCatId(null);
    }

    // if no category is open, optionally open the first one
    if (!openCatId && nextCats.length) {
      setOpenCatId(nextCats[0].id);
    }
  };

  const toBulletsArray = (text) =>
    (text || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const fromBulletsArray = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((v) => (typeof v === "string" ? v : v?.text))
      .filter(Boolean)
      .join("\n");

  const toast = (msg) => {
    setNotice(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setNotice(""), 2500);
  };

  // ---------- CATEGORY CRUD ----------
  const createCategory = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!newCat.title.trim()) throw new Error("Category title is required.");

      const maxOrder = categories.length ? Math.max(...categories.map((c) => c.sort_order || 0)) : 0;
      const payload = {
        title: newCat.title.trim(),
        description: newCat.description?.trim() || null,
        is_published: !!newCat.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("service_categories")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;
      if (!mountedRef.current) return;

      setCategories((prev) =>
        [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );
      setNewCat(emptyCategory);

      // open newly created category
      setOpenCatId(data.id);

      toast("Category created.");
    } catch (e) {
      setError(e.message || "Create category failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateCategory = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("service_categories")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;
      if (!mountedRef.current) return;

      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? data : c))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );

      toast("Category updated.");
    } catch (e) {
      setError(e.message || "Update category failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Delete this category? All services under it will also be deleted.")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("service_categories").delete().eq("id", id);
      if (delErr) throw delErr;
      if (!mountedRef.current) return;

      setCategories((prev) => prev.filter((c) => c.id !== id));
      setItems((prev) => prev.filter((it) => toKey(it.category_id) !== toKey(id)));

      // close accordion if the deleted one is open
      setOpenCatId((prev) => (toKey(prev) === toKey(id) ? null : prev));

      toast("Category deleted.");
    } catch (e) {
      setError(e.message || "Delete category failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveCategory = async (id, dir) => {
    const idx = categories.findIndex((c) => c.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= categories.length) return;

    const a = categories[idx];
    const b = categories[swapWith];

    await Promise.all([
      updateCategory(a.id, { sort_order: b.sort_order }),
      updateCategory(b.id, { sort_order: a.sort_order }),
    ]);
  };

  // ---------- SERVICE CRUD ----------
  const createService = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!newItem.category_id) throw new Error("Select a category first.");
      if (!newItem.title.trim()) throw new Error("Service title is required.");

      const list = items.filter((it) => toKey(it.category_id) === toKey(newItem.category_id));
      const maxOrder = list.length ? Math.max(...list.map((i) => i.sort_order || 0)) : 0;

      const payload = {
        category_id: newItem.category_id,
        title: newItem.title.trim(),
        description: newItem.description?.trim() || null,
        bullets: toBulletsArray(newItem.bulletsText),
        is_published: !!newItem.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("service_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;
      if (!mountedRef.current) return;

      setItems((prev) =>
        [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );

      // open the category we just added to
      setOpenCatId(newItem.category_id);

      setNewItem({ ...emptyService, category_id: newItem.category_id });
      toast("Service created.");
    } catch (e) {
      setError(e.message || "Create service failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateService = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("service_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;
      if (!mountedRef.current) return;

      setItems((prev) =>
        prev
          .map((i) => (i.id === id ? data : i))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );
      toast("Service updated.");
    } catch (e) {
      setError(e.message || "Update service failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async (id) => {
    if (!confirm("Delete this service?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("service_items").delete().eq("id", id);
      if (delErr) throw delErr;
      if (!mountedRef.current) return;

      setItems((prev) => prev.filter((i) => i.id !== id));
      toast("Service deleted.");
    } catch (e) {
      setError(e.message || "Delete service failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveService = async (id, dir) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;

    const list = items
      .filter((x) => toKey(x.category_id) === toKey(it.category_id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = list.findIndex((x) => x.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    await Promise.all([
      updateService(a.id, { sort_order: b.sort_order }),
      updateService(b.id, { sort_order: a.sort_order }),
    ]);
  };

  const openPreview = () => window.open("/#services", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Services editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Services — VA Offerings</h1>
            <div className="small text-muted">Manage categories, services, bullets, publish flags, and order.</div>
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

        {/* Create Category */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Category</h2>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  value={newCat.title}
                  onChange={(e) => setNewCat((p) => ({ ...p, title: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Description (optional)</label>
                <input
                  className="form-control"
                  value={newCat.description}
                  onChange={(e) => setNewCat((p) => ({ ...p, description: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div className="col-6 col-md-1">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!newCat.is_published}
                    onChange={(e) => setNewCat((p) => ({ ...p, is_published: e.target.checked }))}
                    disabled={busy}
                    id="newCatPub"
                  />
                  <label className="form-check-label" htmlFor="newCatPub">
                    Pub
                  </label>
                </div>
              </div>
              <div className="col-6 col-md-1 d-grid">
                <button className="btn btn-primary" onClick={createCategory} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Service */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Service</h2>
            <div className="row g-2">
              <div className="col-12 col-md-3">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newItem.category_id}
                  onChange={(e) => setNewItem((p) => ({ ...p, category_id: e.target.value }))}
                  disabled={busy}
                >
                  <option value="">Select...</option>
                  {categories.map((c) => (
                    <option key={toKey(c.id)} value={toKey(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Title</label>
                <input
                  className="form-control"
                  value={newItem.title}
                  onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Description (optional)</label>
                <input
                  className="form-control"
                  value={newItem.description}
                  onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-6 col-md-1">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!newItem.is_published}
                    onChange={(e) => setNewItem((p) => ({ ...p, is_published: e.target.checked }))}
                    disabled={busy}
                    id="newItemPub"
                  />
                  <label className="form-check-label" htmlFor="newItemPub">
                    Pub
                  </label>
                </div>
              </div>

              <div className="col-6 col-md-1 d-grid">
                <button className="btn btn-primary" onClick={createService} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add
                </button>
              </div>

              <div className="col-12">
                <label className="form-label mt-2">Bullets (one per line)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={newItem.bulletsText}
                  onChange={(e) => setNewItem((p) => ({ ...p, bulletsText: e.target.value }))}
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Listing (React-controlled accordion) */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Catalog</h2>

            {categories.length === 0 ? (
              <div className="text-muted">No categories yet.</div>
            ) : (
              <div className="accordion">
                {categories.map((c) => {
                  const key = toKey(c.id);
                  const isOpen = toKey(openCatId) === key;

                  const list = (itemsByCategory[key] || [])
                    .slice()
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                  return (
                    <div className="accordion-item" key={key}>
                      <h2 className="accordion-header">
                        <button
                          type="button"
                          className={`accordion-button ${isOpen ? "" : "collapsed"}`}
                          onClick={() => setOpenCatId(isOpen ? null : c.id)}
                          aria-expanded={isOpen ? "true" : "false"}
                        >
                          <div className="d-flex flex-wrap gap-2 align-items-center w-100">
                            <span className="fw-semibold">{c.title}</span>
                            {c.is_published ? (
                              <span className="badge text-bg-success">Published</span>
                            ) : (
                              <span className="badge text-bg-secondary">Hidden</span>
                            )}
                            <span className="ms-auto text-muted small">Order: {c.sort_order}</span>
                          </div>
                        </button>
                      </h2>

                      <div className={`accordion-collapse ${isOpen ? "show" : "collapse"}`}>
                        {isOpen ? (
                          <div className="accordion-body">
                            {/* category editor */}
                            <div className="row g-2 align-items-end mb-3">
                              <div className="col-12 col-md-4">
                                <label className="form-label">Title</label>
                                <input
                                  className="form-control"
                                  defaultValue={c.title}
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v && v !== c.title) updateCategory(c.id, { title: v });
                                  }}
                                  disabled={busy}
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <label className="form-label">Description</label>
                                <input
                                  className="form-control"
                                  defaultValue={c.description || ""}
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v !== (c.description || "")) updateCategory(c.id, { description: v || null });
                                  }}
                                  disabled={busy}
                                />
                              </div>

                              <div className="col-6 col-md-1">
                                <div className="form-check mt-4">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    defaultChecked={!!c.is_published}
                                    onChange={(e) => updateCategory(c.id, { is_published: e.target.checked })}
                                    disabled={busy}
                                    id={`catPub_${key}`}
                                  />
                                  <label className="form-check-label" htmlFor={`catPub_${key}`}>
                                    Pub
                                  </label>
                                </div>
                              </div>

                              <div className="col-6 col-md-1 d-grid">
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => deleteCategory(c.id)}
                                  disabled={busy}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </div>
                            </div>

                            <div className="d-flex gap-2 mb-3">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => moveCategory(c.id, "up")}
                                disabled={busy}
                              >
                                <i className="fa-solid fa-arrow-up me-2"></i>Move up
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => moveCategory(c.id, "down")}
                                disabled={busy}
                              >
                                <i className="fa-solid fa-arrow-down me-2"></i>Move down
                              </button>
                            </div>

                            <hr />

                            {list.length === 0 ? (
                              <div className="text-muted">No services in this category yet.</div>
                            ) : (
                              <div className="vstack gap-2">
                                {list.map((it) => (
                                  <div className="border rounded p-3 bg-white" key={toKey(it.id)}>
                                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                                      <div className="fw-semibold">{it.title}</div>
                                      <div className="d-flex gap-2 align-items-center">
                                        {it.is_published ? (
                                          <span className="badge text-bg-success">Published</span>
                                        ) : (
                                          <span className="badge text-bg-secondary">Hidden</span>
                                        )}
                                        <span className="text-muted small">Order: {it.sort_order}</span>
                                      </div>
                                    </div>

                                    <div className="row g-2 mt-2">
                                      <div className="col-12 col-md-4">
                                        <label className="form-label">Title</label>
                                        <input
                                          className="form-control"
                                          defaultValue={it.title}
                                          onBlur={(e) => {
                                            const v = e.target.value.trim();
                                            if (v && v !== it.title) updateService(it.id, { title: v });
                                          }}
                                          disabled={busy}
                                        />
                                      </div>

                                      <div className="col-12 col-md-5">
                                        <label className="form-label">Description</label>
                                        <input
                                          className="form-control"
                                          defaultValue={it.description || ""}
                                          onBlur={(e) => {
                                            const v = e.target.value.trim();
                                            if (v !== (it.description || "")) updateService(it.id, { description: v || null });
                                          }}
                                          disabled={busy}
                                        />
                                      </div>

                                      <div className="col-6 col-md-1">
                                        <div className="form-check mt-4">
                                          <input
                                            className="form-check-input"
                                            type="checkbox"
                                            defaultChecked={!!it.is_published}
                                            onChange={(e) => updateService(it.id, { is_published: e.target.checked })}
                                            disabled={busy}
                                            id={`itPub_${toKey(it.id)}`}
                                          />
                                          <label className="form-check-label" htmlFor={`itPub_${toKey(it.id)}`}>
                                            Pub
                                          </label>
                                        </div>
                                      </div>

                                      <div className="col-6 col-md-2 d-grid">
                                        <button
                                          className="btn btn-outline-danger mt-md-4"
                                          onClick={() => deleteService(it.id)}
                                          disabled={busy}
                                        >
                                          <i className="fa-solid fa-trash me-2"></i>Delete
                                        </button>
                                      </div>

                                      <div className="col-12">
                                        <label className="form-label">Bullets (one per line)</label>
                                        <textarea
                                          className="form-control"
                                          rows="3"
                                          defaultValue={fromBulletsArray(it.bullets)}
                                          onBlur={(e) => updateService(it.id, { bullets: toBulletsArray(e.target.value) })}
                                          disabled={busy}
                                        />
                                      </div>

                                      <div className="col-12">
                                        <div className="d-flex gap-2">
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => moveService(it.id, "up")}
                                            disabled={busy}
                                          >
                                            <i className="fa-solid fa-arrow-up me-2"></i>Move up
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => moveService(it.id, "down")}
                                            disabled={busy}
                                          >
                                            <i className="fa-solid fa-arrow-down me-2"></i>Move down
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 small text-muted">
              Ordering uses <code>sort_order</code>. “Move up/down” swaps sort_order values.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
