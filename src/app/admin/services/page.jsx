// src/app/admin/services/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

const emptyCategory = { title: "", description: "", is_published: true };
const emptyService = { title: "", description: "", bulletsText: "", is_published: true };

const bulletsPlaceholder =
  "Example:\n" +
  "• Inbox + calendar management\n" +
  "• Data entry / research\n" +
  "• Weekly progress report";

const BULLET = "• ";

const ensureBulletsFormat = (text) => {
  // Normalize lines so each non-empty line starts with "• "
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const fixed = lines.map((line) => {
    const t = line.trimStart();
    if (!t) return ""; // keep empty line
    return t.startsWith("•") ? `• ${t.replace(/^•\s*/, "")}` : `• ${t}`;
  });
  return fixed.join("\n");
};

const handleBulletsKeyDown = (e, currentValue, setValue) => {
  if (e.key !== "Enter") return;

  // If user is using IME or modifiers, ignore
  if (e.isComposing || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return;

  e.preventDefault();

  const el = e.currentTarget;
  const start = el.selectionStart;
  const end = el.selectionEnd;

  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);

  // Add newline + bullet
  const insert = "\n" + BULLET;
  const next = before + insert + after;

  setValue(next);

  // Restore caret after React updates state
  requestAnimationFrame(() => {
    const pos = start + insert.length;
    el.selectionStart = pos;
    el.selectionEnd = pos;
  });
};


export default function AdminServicesPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  // Simple UI: pick one category to manage
  const [selectedCatId, setSelectedCatId] = useState("");

  // Create forms
  const [newCat, setNewCat] = useState(emptyCategory);
  const [newItem, setNewItem] = useState({ ...emptyService, category_id: "" });

  // ------- DRAFT EDITING (Save button) -------
  const [catDraft, setCatDraft] = useState({ title: "", description: "", is_published: true });
  const [serviceDrafts, setServiceDrafts] = useState({}); // { [serviceId]: { title, description, is_published, bulletsText } }
  const [dirty, setDirty] = useState(false);

  const toKey = (v) => String(v ?? "");

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

  const categoriesSorted = useMemo(() => {
    return (categories || []).slice().sort((a, b) => {
      const ao = a.sort_order || 0;
      const bo = b.sort_order || 0;
      if (ao !== bo) return ao - bo;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  }, [categories]);

  const itemsSorted = useMemo(() => {
    return (items || []).slice().sort((a, b) => {
      const ao = a.sort_order || 0;
      const bo = b.sort_order || 0;
      if (ao !== bo) return ao - bo;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  }, [items]);

  const itemsByCategory = useMemo(() => {
    const map = {};
    for (const c of categoriesSorted) map[toKey(c.id)] = [];
    for (const it of itemsSorted) {
      const k = toKey(it.category_id);
      if (!map[k]) map[k] = [];
      map[k].push(it);
    }
    return map;
  }, [categoriesSorted, itemsSorted]);

  const selectedCategory = useMemo(() => {
    if (!selectedCatId) return null;
    return categoriesSorted.find((c) => toKey(c.id) === toKey(selectedCatId)) || null;
  }, [categoriesSorted, selectedCatId]);

  const selectedCategoryIndex = useMemo(() => {
    if (!selectedCatId) return -1;
    return categoriesSorted.findIndex((c) => toKey(c.id) === toKey(selectedCatId));
  }, [categoriesSorted, selectedCatId]);

  const selectedServices = useMemo(() => {
    if (!selectedCatId) return [];
    const list = itemsByCategory[toKey(selectedCatId)] || [];
    return list.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [itemsByCategory, selectedCatId]);

  // init auth + load
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

    const stillExists = selectedCatId && nextCats.some((c) => toKey(c.id) === toKey(selectedCatId));
    if (!stillExists) {
      setSelectedCatId(nextCats.length ? toKey(nextCats[0].id) : "");
    }
  };

  // When selection changes, reset drafts from DB state (simple and safe)
  useEffect(() => {
    if (!selectedCategory) {
      setCatDraft({ title: "", description: "", is_published: true });
      setServiceDrafts({});
      setDirty(false);
      return;
    }

    setCatDraft({
      title: selectedCategory.title || "",
      description: selectedCategory.description || "",
      is_published: !!selectedCategory.is_published,
    });

    const drafts = {};
    for (const it of selectedServices) {
      drafts[toKey(it.id)] = {
        title: it.title || "",
        description: it.description || "",
        is_published: !!it.is_published,
        bulletsText: fromBulletsArray(it.bullets),
      };
    }
    setServiceDrafts(drafts);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatId]); // reset drafts only when switching category

  // ---------- CATEGORY CRUD ----------
  const createCategory = async () => {
    const ok = await confirm({
      title: "Add category?",
      message: "This will create a new service category.",
      confirmText: "Add",
      confirmVariant: "primary",
    });
    if (!ok) return;

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
      setSelectedCatId(toKey(data.id));
      toast("Category created.");
      success({ title: "Category added", message: "The category was created successfully." });
    } catch (e) {
      setError(e.message || "Create category failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateCategory = async (id, patch) => {
    const { data, error: updErr } = await supabase
      .from("service_categories")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (updErr) throw updErr;
    if (!mountedRef.current) return null;

    setCategories((prev) =>
      prev
        .map((c) => (c.id === id ? data : c))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    );

    return data;
  };

  const deleteCategory = async (id) => {
    const ok = await confirm({
      title: "Delete category?",
      message: "This will delete the category and all services under it.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("service_categories").delete().eq("id", id);
      if (delErr) throw delErr;
      if (!mountedRef.current) return;

      setCategories((prev) => prev.filter((c) => c.id !== id));
      setItems((prev) => prev.filter((it) => toKey(it.category_id) !== toKey(id)));

      const remaining = categoriesSorted.filter((c) => c.id !== id);
      setSelectedCatId(remaining.length ? toKey(remaining[0].id) : "");
      toast("Category deleted.");
      success({ title: "Category deleted", message: "The category and its services were removed." });
    } catch (e) {
      setError(e.message || "Delete category failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveCategory = async (id, dir) => {
    const list = categoriesSorted;
    const idx = list.findIndex((c) => c.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await Promise.all([
        updateCategory(a.id, { sort_order: b.sort_order }),
        updateCategory(b.id, { sort_order: a.sort_order }),
      ]);
      toast("Category reordered.");
    } catch (e) {
      setError(e.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
  };

  // ---------- SERVICE CRUD ----------
  const createService = async () => {
    const ok = await confirm({
      title: "Add service?",
      message: "This will create a new service item.",
      confirmText: "Add",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const catId = newItem.category_id || selectedCatId;
      if (!catId) throw new Error("Select a category first.");
      if (!newItem.title.trim()) throw new Error("Service title is required.");

      const list = (itemsByCategory[toKey(catId)] || []).slice();
      const maxOrder = list.length ? Math.max(...list.map((i) => i.sort_order || 0)) : 0;

      const payload = {
        category_id: catId,
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

      setSelectedCatId(toKey(catId));
      setNewItem({ ...emptyService, category_id: toKey(catId) });

      // also seed draft for new service
      setServiceDrafts((prev) => ({
        ...prev,
        [toKey(data.id)]: {
          title: data.title || "",
          description: data.description || "",
          is_published: !!data.is_published,
          bulletsText: fromBulletsArray(data.bullets),
        },
      }));

      toast("Service created.");
      success({ title: "Service added", message: "The service was created successfully." });
    } catch (e) {
      setError(e.message || "Create service failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async (id) => {
    const ok = await confirm({
      title: "Delete service?",
      message: "This will permanently remove the service.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("service_items").delete().eq("id", id);
      if (delErr) throw delErr;
      if (!mountedRef.current) return;

      setItems((prev) => prev.filter((i) => i.id !== id));
      setServiceDrafts((prev) => {
        const next = { ...prev };
        delete next[toKey(id)];
        return next;
      });
      setDirty(true);
      toast("Service deleted.");
      success({ title: "Service deleted", message: "The service was removed." });
    } catch (e) {
      setError(e.message || "Delete service failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveService = async (id, dir) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;

    const list = (itemsByCategory[toKey(it.category_id)] || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = list.findIndex((x) => x.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // reorder is an immediate action (no need to "Save" for this)
      const [ua, ub] = await Promise.all([
        supabase.from("service_items").update({ sort_order: b.sort_order }).eq("id", a.id).select("*").single(),
        supabase.from("service_items").update({ sort_order: a.sort_order }).eq("id", b.id).select("*").single(),
      ]);

      if (ua.error) throw ua.error;
      if (ub.error) throw ub.error;

      if (!mountedRef.current) return;

      setItems((prev) =>
        prev
          .map((x) => (x.id === a.id ? ua.data : x.id === b.id ? ub.data : x))
          .sort((p, q) => (p.sort_order || 0) - (q.sort_order || 0))
      );

      toast("Service reordered.");
    } catch (e) {
      setError(e.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
  };

  // ------- SAVE (batch update drafts) -------
  const saveChanges = async () => {
    if (!selectedCategory) return;

    const ok = await confirm({
      title: "Save changes?",
      message: "Apply your edits to the category and its services.",
      confirmText: "Save",
      confirmVariant: "success",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // category patch (only if changed)
      const catPatch = {};
      if ((catDraft.title || "").trim() !== (selectedCategory.title || "").trim()) {
        if (!(catDraft.title || "").trim()) throw new Error("Category title is required.");
        catPatch.title = (catDraft.title || "").trim();
      }
      if ((catDraft.description || "").trim() !== (selectedCategory.description || "").trim()) {
        const v = (catDraft.description || "").trim();
        catPatch.description = v ? v : null;
      }
      if (!!catDraft.is_published !== !!selectedCategory.is_published) {
        catPatch.is_published = !!catDraft.is_published;
      }

      // services patch list
      const serviceUpdates = [];
      for (const it of selectedServices) {
        const d = serviceDrafts[toKey(it.id)];
        if (!d) continue;

        const patch = {};
        const nextTitle = (d.title || "").trim();
        const nextDesc = (d.description || "").trim();
        const nextPub = !!d.is_published;
        const nextBullets = toBulletsArray(d.bulletsText);

        if (nextTitle !== (it.title || "").trim()) {
          if (!nextTitle) throw new Error("Service title is required.");
          patch.title = nextTitle;
        }
        if (nextDesc !== (it.description || "").trim()) patch.description = nextDesc ? nextDesc : null;
        if (nextPub !== !!it.is_published) patch.is_published = nextPub;

        const prevBulletsText = fromBulletsArray(it.bullets);
        const nextBulletsText = (d.bulletsText || "").trim();
        if (nextBulletsText !== (prevBulletsText || "").trim()) patch.bullets = nextBullets;

        if (Object.keys(patch).length) {
          serviceUpdates.push({ id: it.id, patch });
        }
      }

      // execute updates
      if (Object.keys(catPatch).length) {
        await updateCategory(selectedCategory.id, catPatch);
      }

      if (serviceUpdates.length) {
        // Run sequentially to keep it simple and avoid rate/locking surprises
        for (const u of serviceUpdates) {
          const { data, error: updErr } = await supabase
            .from("service_items")
            .update(u.patch)
            .eq("id", u.id)
            .select("*")
            .single();
          if (updErr) throw updErr;

          if (!mountedRef.current) return;

          setItems((prev) =>
            prev
              .map((x) => (x.id === u.id ? data : x))
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          );
        }
      }

      if (!Object.keys(catPatch).length && !serviceUpdates.length) {
        toast("No changes to save.");
        setDirty(false);
        return;
      }

      toast("Saved.");
      setDirty(false);
      success({ title: "Changes saved", message: "Service updates were applied." });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const discardChanges = async () => {
    if (!selectedCategory) return;
    if (!dirty) return;
    const ok = await confirm({
      title: "Discard changes?",
      message: "You have unsaved changes. Discard them?",
      confirmText: "Discard",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setCatDraft({
      title: selectedCategory.title || "",
      description: selectedCategory.description || "",
      is_published: !!selectedCategory.is_published,
    });

    const drafts = {};
    for (const it of selectedServices) {
      drafts[toKey(it.id)] = {
        title: it.title || "",
        description: it.description || "",
        is_published: !!it.is_published,
        bulletsText: fromBulletsArray(it.bullets),
      };
    }
    setServiceDrafts(drafts);
    setDirty(false);
    toast("Changes discarded.");
  };

  const openPreview = () => window.open("/#services", "_blank");

  const BadgePub = ({ pub }) =>
    pub ? (
      <span className="badge text-bg-success">Published</span>
    ) : (
      <span className="badge text-bg-secondary">Hidden</span>
    );

  const onChangeCatDraft = (patch) => {
    setCatDraft((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const onChangeServiceDraft = (id, patch) => {
    const k = toKey(id);
    setServiceDrafts((prev) => ({
      ...prev,
      [k]: { ...(prev[k] || {}), ...patch },
    }));
    setDirty(true);
  };

  const onSelectCategory = async (nextId) => {
    if (dirty) {
      const ok = await confirm({
        title: "Switch category?",
        message: "You have unsaved changes. Discard them and switch category?",
        confirmText: "Switch",
        confirmVariant: "danger",
      });
      if (!ok) return;
    }
    setSelectedCatId(nextId);
  };

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
        {/* Header */}
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Services — VA Offerings</h1>
            <div className="small text-muted">
              Edit fields then click <b>Save Changes</b>. We show <b>Position</b> instead of “Order: 10/20”.
            </div>
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

        {/* Alerts */}
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

        {/* Add Category */}
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

        {/* Add Service */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Service</h2>
            <div className="row g-2">
              <div className="col-12 col-md-3">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newItem.category_id || selectedCatId}
                  onChange={(e) => setNewItem((p) => ({ ...p, category_id: e.target.value }))}
                  disabled={busy}
                >
                  <option value="">Select...</option>
                  {categoriesSorted.map((c, idx) => (
                    <option key={toKey(c.id)} value={toKey(c.id)}>
                      {idx + 1}. {c.title}
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
                  onChange={(e) => {
                    // Optional: enforce bullet prefix while typing
                    setNewItem((p) => ({ ...p, bulletsText: e.target.value }));
                  }}
                  onKeyDown={(e) =>
                    handleBulletsKeyDown(e, newItem.bulletsText, (v) =>
                      setNewItem((p) => ({ ...p, bulletsText: v }))
                    )
                  }
                  onFocus={() => {
                    // Optional: if empty, start with a bullet
                    setNewItem((p) => {
                      if ((p.bulletsText || "").trim()) return p;
                      return { ...p, bulletsText: BULLET };
                    });
                  }}
                  onBlur={() => {
                    // Optional: cleanup/normalize bullets on blur
                    setNewItem((p) => ({ ...p, bulletsText: ensureBulletsFormat(p.bulletsText) }));
                  }}
                  placeholder={bulletsPlaceholder}
                  disabled={busy}
                />


              </div>
            </div>
          </div>
        </div>

        {/* Catalog */}
        <div className="row g-3">
          {/* Left: Category Picker */}
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h2 className="h6 mb-0">Categories</h2>
                  <button className="btn btn-sm btn-outline-secondary" onClick={reloadAll} disabled={busy}>
                    <i className="fa-solid fa-rotate me-2"></i>Reload
                  </button>
                </div>

                {categoriesSorted.length === 0 ? (
                  <div className="text-muted">No categories yet.</div>
                ) : (
                  <select
                    className="form-select"
                    value={selectedCatId}
                    onChange={(e) => onSelectCategory(e.target.value)}
                    disabled={busy}
                  >
                    {categoriesSorted.map((c, idx) => (
                      <option key={toKey(c.id)} value={toKey(c.id)}>
                        {idx + 1}. {c.title}
                      </option>
                    ))}
                  </select>
                )}

                <div className="small text-muted mt-2">Pick a category, edit on the right, then click Save.</div>

                {selectedCategory ? (
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => moveCategory(selectedCategory.id, "up")}
                      disabled={busy || selectedCategoryIndex <= 0}
                      type="button"
                    >
                      <i className="fa-solid fa-arrow-up me-2"></i>Up
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => moveCategory(selectedCategory.id, "down")}
                      disabled={busy || selectedCategoryIndex === categoriesSorted.length - 1}
                      type="button"
                    >
                      <i className="fa-solid fa-arrow-down me-2"></i>Down
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger ms-auto"
                      onClick={() => deleteCategory(selectedCategory.id)}
                      disabled={busy}
                      type="button"
                    >
                      <i className="fa-solid fa-trash me-2"></i>Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Editor */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
                  <h2 className="h6 mb-0">Editor</h2>

                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={discardChanges}
                      disabled={busy || !dirty}
                      type="button"
                    >
                      Discard
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={saveChanges}
                      disabled={busy || !dirty || !selectedCategory}
                      type="button"
                    >
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
                  </div>
                </div>

                {!selectedCategory ? (
                  <div className="text-muted">Select a category to edit.</div>
                ) : (
                  <>
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                      <span className="badge text-bg-light border text-muted">
                        Category Position: {selectedCategoryIndex + 1}
                      </span>
                      <BadgePub pub={!!catDraft.is_published} />
                      <span className="badge text-bg-light border text-muted">
                        Services: {selectedServices.length}
                      </span>
                      {dirty ? <span className="badge text-bg-warning">Unsaved</span> : null}
                    </div>

                    {/* Category Fields */}
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md-5">
                        <label className="form-label">Category Title</label>
                        <input
                          className="form-control"
                          value={catDraft.title}
                          onChange={(e) => onChangeCatDraft({ title: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-5">
                        <label className="form-label">Category Description</label>
                        <input
                          className="form-control"
                          value={catDraft.description}
                          onChange={(e) => onChangeCatDraft({ description: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-2">
                        <label className="form-label d-block">Published</label>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`catPub_${toKey(selectedCategory.id)}`}
                            checked={!!catDraft.is_published}
                            onChange={(e) => onChangeCatDraft({ is_published: e.target.checked })}
                            disabled={busy}
                          />
                          <label className="form-check-label" htmlFor={`catPub_${toKey(selectedCategory.id)}`}>
                            Visible
                          </label>
                        </div>
                      </div>
                    </div>

                    <hr className="my-3" />

                    {/* Services List */}
                    {selectedServices.length === 0 ? (
                      <div className="text-muted">No services in this category yet.</div>
                    ) : (
                      <div className="vstack gap-2">
                        {selectedServices.map((it, idx) => {
                          const d = serviceDrafts[toKey(it.id)] || {
                            title: it.title || "",
                            description: it.description || "",
                            is_published: !!it.is_published,
                            bulletsText: fromBulletsArray(it.bullets),
                          };

                          return (
                            <div className="card" key={toKey(it.id)}>
                              <div className="card-body">
                                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                                  <div className="d-flex flex-wrap gap-2 align-items-center">
                                    <div className="fw-semibold">{d.title || "(Untitled service)"}</div>
                                    <BadgePub pub={!!d.is_published} />
                                    <span className="badge text-bg-light border text-muted">Position: {idx + 1}</span>
                                  </div>

                                  <div className="d-flex gap-2">
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => moveService(it.id, "up")}
                                      disabled={busy || idx === 0}
                                      type="button"
                                      title="Move up"
                                    >
                                      <i className="fa-solid fa-arrow-up"></i>
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => moveService(it.id, "down")}
                                      disabled={busy || idx === selectedServices.length - 1}
                                      type="button"
                                      title="Move down"
                                    >
                                      <i className="fa-solid fa-arrow-down"></i>
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => deleteService(it.id)}
                                      disabled={busy}
                                      type="button"
                                      title="Delete"
                                    >
                                      <i className="fa-solid fa-trash"></i>
                                    </button>
                                  </div>
                                </div>

                                <div className="row g-2 mt-2">
                                  <div className="col-12 col-md-4">
                                    <label className="form-label">Title</label>
                                    <input
                                      className="form-control"
                                      value={d.title}
                                      onChange={(e) => onChangeServiceDraft(it.id, { title: e.target.value })}
                                      disabled={busy}
                                    />
                                  </div>

                                  <div className="col-12 col-md-5">
                                    <label className="form-label">Description</label>
                                    <input
                                      className="form-control"
                                      value={d.description}
                                      onChange={(e) => onChangeServiceDraft(it.id, { description: e.target.value })}
                                      disabled={busy}
                                    />
                                  </div>

                                  <div className="col-12 col-md-3">
                                    <label className="form-label d-block">Published</label>
                                    <div className="form-check">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`itPub_${toKey(it.id)}`}
                                        checked={!!d.is_published}
                                        onChange={(e) => onChangeServiceDraft(it.id, { is_published: e.target.checked })}
                                        disabled={busy}
                                      />
                                      <label className="form-check-label" htmlFor={`itPub_${toKey(it.id)}`}>
                                        Visible
                                      </label>
                                    </div>
                                  </div>

                                  <div className="col-12">
                                    <label className="form-label">Bullets (one per line)</label>
                                    <textarea
                                      className="form-control"
                                      rows="3"
                                      value={d.bulletsText}
                                      onChange={(e) => onChangeServiceDraft(it.id, { bulletsText: e.target.value })}
                                      onKeyDown={(e) =>
                                        handleBulletsKeyDown(e, d.bulletsText, (v) =>
                                          onChangeServiceDraft(it.id, { bulletsText: v })
                                        )
                                      }
                                      onFocus={() => {
                                        onChangeServiceDraft(it.id, {
                                          bulletsText: (d.bulletsText || "").trim() ? d.bulletsText : BULLET,
                                        });
                                      }}
                                      onBlur={() => {
                                        onChangeServiceDraft(it.id, { bulletsText: ensureBulletsFormat(d.bulletsText) });
                                      }}
                                      placeholder={bulletsPlaceholder}
                                      disabled={busy}
                                    />


                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="small text-muted mt-3">
          Tip: “Move up/down” reorders immediately. Field edits are saved only when you click <b>Save Changes</b>.
        </div>
      </div>
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
