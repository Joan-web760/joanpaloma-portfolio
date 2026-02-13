// src/app/admin/portfolio/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";
import AdminStepper, { AdminStep } from "@/components/admin/AdminStepper";

/** Helpers */
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

const toTags = (text) =>
  (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const fromTags = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean)
    .join(", ");

/** Config */
const BUCKET = "portfolio-media";
const ACCEPTED_EXT = ["png", "jpg", "jpeg", "webp", "gif", "mp4"];
const MAX_FILE_MB = 25;

const extOf = (name) => {
  const parts = (name || "").split(".");
  return (parts.length > 1 ? parts.pop() : "").toLowerCase();
};

const isVideoExt = (ext) => ext === "mp4";

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) out[k] = obj?.[k];
  return out;
};

export default function AdminPortfolioPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [media, setMedia] = useState([]);

  // Signed URLs cache (for private buckets)
  const [signedUrlMap, setSignedUrlMap] = useState({}); // { file_path: url }

  // Upload progress UI
  const [uploadingFor, setUploadingFor] = useState(null); // portfolioId
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const [newItem, setNewItem] = useState({
    title: "",
    subtitle: "",
    description: "",
    project_url: "",
    repo_url: "",
    resultsText: "",
    tagsText: "",
    is_featured: false,
    is_published: true,
  });

  // staged files for Add Item form
  const [newItemFiles, setNewItemFiles] = useState([]);

  // ✅ DRAFTS + Save UX
  const [draftItems, setDraftItems] = useState({}); // { [id]: { ...editable fields } }
  const [dirtyIds, setDirtyIds] = useState(new Set()); // Set of item ids with unsaved changes

  const toast = (msg) => {
    setNotice(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setNotice(""), 2200);
  };

  const mediaByItem = useMemo(() => {
    const map = {};
    for (const it of items) map[it.id] = [];
    for (const m of media) {
      if (!map[m.portfolio_id]) map[m.portfolio_id] = [];
      map[m.portfolio_id].push(m);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [items, media]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/portfolio");
        return;
      }
      await reloadAll(true);
    })();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const reloadAll = async (alive = true) => {
    setError("");

    const { data: itData, error: itErr } = await supabase
      .from("portfolio_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!alive || !mountedRef.current) return;
    if (itErr) {
      setError(itErr.message || "Failed to load portfolio items.");
      setLoading(false);
      return;
    }

    const { data: mData, error: mErr } = await supabase
      .from("portfolio_media")
      .select("*")
      .order("portfolio_id", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!alive || !mountedRef.current) return;
    if (mErr) {
      setError(mErr.message || "Failed to load portfolio media.");
      setLoading(false);
      return;
    }

    setItems(itData || []);
    setMedia(mData || []);
    setLoading(false);

    // ✅ reset drafts to latest server state
    const nextDrafts = {};
    for (const it of itData || []) {
      nextDrafts[it.id] = {
        title: it.title || "",
        subtitle: it.subtitle || "",
        description: it.description || "",
        project_url: it.project_url || "",
        repo_url: it.repo_url || "",
        resultsText: fromArr(it.results),
        tagsText: fromTags(it.tags),
        is_featured: !!it.is_featured,
        is_published: !!it.is_published,
      };
    }
    setDraftItems(nextDrafts);
    setDirtyIds(new Set());
  };

  /** Public URL (works if bucket public). If private, fall back to signed URLs. */
  const publicUrl = (path) => {
    if (!path) return "";
    const cached = signedUrlMap[path];
    if (cached) return cached;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  };

  /** If bucket is private, call this after uploads / reload */
  const ensureSignedUrls = async (paths = []) => {
    const uniq = Array.from(new Set(paths.filter(Boolean)));
    const missing = uniq.filter((p) => !signedUrlMap[p]);
    if (!missing.length) return;

    const { data, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrls(
      missing,
      60 * 60
    );

    if (signErr) return;

    const next = { ...signedUrlMap };
    for (const row of data || []) {
      if (row?.path && row?.signedUrl) next[row.path] = row.signedUrl;
    }
    if (mountedRef.current) setSignedUrlMap(next);
  };

  const openPreview = () => window.open("/#portfolio", "_blank");

  // ---------- MEDIA ----------
  const validateFiles = (files) => {
    const ok = [];
    const bad = [];

    for (const f of files) {
      const ext = extOf(f.name);
      const sizeMb = f.size / 1024 / 1024;
      if (!ACCEPTED_EXT.includes(ext)) bad.push(`${f.name} (unsupported .${ext || "?"})`);
      else if (sizeMb > MAX_FILE_MB)
        bad.push(`${f.name} (${sizeMb.toFixed(1)}MB > ${MAX_FILE_MB}MB)`);
      else ok.push(f);
    }

    return { ok, bad };
  };

  const uploadFiles = async (portfolioId, files) => {
    if (!portfolioId) throw new Error("portfolioId required.");
    if (!files || !files.length) return;

    const { ok, bad } = validateFiles(files);
    if (bad.length) setError(`Some files were skipped:\n- ${bad.join("\n- ")}`);
    if (!ok.length) return;

    setBusy(true);
    setUploadingFor(portfolioId);
    setUploadProgress({ done: 0, total: ok.length });
    setNotice("");

    try {
      const list = media.filter((m) => m.portfolio_id === portfolioId);
      let nextOrder = list.length ? Math.max(...list.map((m) => m.sort_order || 0)) + 10 : 10;

      const inserts = [];
      const newPaths = [];

      for (let i = 0; i < ok.length; i++) {
        const file = ok[i];

        const ext = extOf(file.name) || "png";
        const safeExt = ACCEPTED_EXT.includes(ext) ? ext : "png";

        const filename = `${crypto.randomUUID()}.${safeExt}`;
        const path = `portfolio/${portfolioId}/${filename}`;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
          cacheControl: "3600",
        });

        if (upErr) throw upErr;

        inserts.push({
          portfolio_id: portfolioId,
          file_path: path,
          media_type: isVideoExt(safeExt) ? "video" : "image",
          sort_order: nextOrder,
          is_published: true,
        });

        newPaths.push(path);
        nextOrder += 10;

        setUploadProgress((p) => ({ ...p, done: i + 1 }));
      }

      const { data, error: insErr } = await supabase.from("portfolio_media").insert(inserts).select("*");
      if (insErr) throw insErr;

      setMedia((prev) => [...prev, ...(data || [])]);
      await ensureSignedUrls(newPaths);

      toast("Uploaded media.");
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
      setUploadingFor(null);
      setUploadProgress({ done: 0, total: 0 });
    }
  };

  const updateMedia = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("portfolio_media")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setMedia((prev) => prev.map((m) => (m.id === id ? data : m)));
      toast("Media updated.");
    } catch (e) {
      setError(e.message || "Media update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteMedia = async (m) => {
    const ok = await confirm({
      title: "Delete media item?",
      message: "This will remove the media and delete the file from storage.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: stErr } = await supabase.storage.from(BUCKET).remove([m.file_path]);
      if (stErr) throw stErr;

      const { error: delErr } = await supabase.from("portfolio_media").delete().eq("id", m.id);
      if (delErr) throw delErr;

      setMedia((prev) => prev.filter((x) => x.id !== m.id));

      setSignedUrlMap((prev) => {
        const next = { ...prev };
        delete next[m.file_path];
        return next;
      });

      toast("Media deleted.");
      success({ title: "Media deleted", message: "The media item was removed." });
    } catch (e) {
      setError(e.message || "Media delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveMedia = async (portfolioId, mediaId, dir) => {
    const list = (mediaByItem[portfolioId] || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = list.findIndex((x) => x.id === mediaId);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    await Promise.all([
      updateMedia(a.id, { sort_order: b.sort_order }),
      updateMedia(b.id, { sort_order: a.sort_order }),
    ]);
  };

  // ---------- ITEMS ----------
  const createItem = async () => {
    const ok = await confirm({
      title: "Add portfolio item?",
      message: "This will create a new portfolio entry.",
      confirmText: "Add",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!newItem.title.trim()) throw new Error("Title is required.");

      const maxOrder = items.length ? Math.max(...items.map((x) => x.sort_order || 0)) : 0;

      const payload = {
        title: newItem.title.trim(),
        subtitle: newItem.subtitle.trim() || null,
        description: newItem.description.trim() || null,
        project_url: newItem.project_url.trim() || null,
        repo_url: newItem.repo_url.trim() || null,
        results: toLines(newItem.resultsText),
        tags: toTags(newItem.tagsText),
        is_featured: !!newItem.is_featured,
        is_published: !!newItem.is_published,
        sort_order: maxOrder + 10,
      };

      const { data: created, error: insErr } = await supabase
        .from("portfolio_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      if (newItemFiles.length) await uploadFiles(created.id, newItemFiles);

      setItems((prev) => [...prev, created].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

      // add draft for the new item
      setDraftItems((prev) => ({
        ...prev,
        [created.id]: {
          title: created.title || "",
          subtitle: created.subtitle || "",
          description: created.description || "",
          project_url: created.project_url || "",
          repo_url: created.repo_url || "",
          resultsText: fromArr(created.results),
          tagsText: fromTags(created.tags),
          is_featured: !!created.is_featured,
          is_published: !!created.is_published,
        },
      }));

      setNewItem({
        title: "",
        subtitle: "",
        description: "",
        project_url: "",
        repo_url: "",
        resultsText: "",
        tagsText: "",
        is_featured: false,
        is_published: true,
      });
      setNewItemFiles([]);

      toast("Portfolio item created.");
      success({ title: "Portfolio item added", message: "The portfolio item was created." });
    } catch (e) {
      setError(e.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    const ok = await confirm({
      title: "Delete portfolio item?",
      message: "This will delete the item and its media records.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const toDelete = media.filter((m) => m.portfolio_id === id).map((m) => m.file_path);
      if (toDelete.length) await supabase.storage.from(BUCKET).remove(toDelete);

      const { error: delErr } = await supabase.from("portfolio_items").delete().eq("id", id);
      if (delErr) throw delErr;

      setItems((prev) => prev.filter((x) => x.id !== id));
      setMedia((prev) => prev.filter((m) => m.portfolio_id !== id));
      setDraftItems((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      toast("Item deleted.");
      success({ title: "Portfolio item deleted", message: "The item was removed." });
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

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: e1 } = await supabase.from("portfolio_items").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("portfolio_items").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (e2) throw e2;

      setItems((prev) =>
        prev
          .map((x) => (x.id === a.id ? { ...x, sort_order: b.sort_order } : x.id === b.id ? { ...x, sort_order: a.sort_order } : x))
          .sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0))
      );

      toast("Order updated.");
    } catch (e) {
      setError(e.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
  };

  // ✅ DRAFT handlers (no saving on blur/change)
  const markDirty = (id) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const setDraft = (id, patch) => {
    setDraftItems((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
    markDirty(id);
  };

  const discardChanges = () => {
    const nextDrafts = {};
    for (const it of items) {
      nextDrafts[it.id] = {
        title: it.title || "",
        subtitle: it.subtitle || "",
        description: it.description || "",
        project_url: it.project_url || "",
        repo_url: it.repo_url || "",
        resultsText: fromArr(it.results),
        tagsText: fromTags(it.tags),
        is_featured: !!it.is_featured,
        is_published: !!it.is_published,
      };
    }
    setDraftItems(nextDrafts);
    setDirtyIds(new Set());
    toast("Changes discarded.");
  };

  const saveChanges = async () => {
    const ids = Array.from(dirtyIds);
    if (!ids.length) return;

    const ok = await confirm({
      title: "Save changes?",
      message: "Apply your edits to the selected portfolio items.",
      confirmText: "Save",
      confirmVariant: "success",
    });
    if (!ok) return;

    setSaving(true);
    setBusy(true);
    setError("");
    setNotice("");

    try {
      // save sequentially (simpler + clear errors)
      const updatedRows = [];
      for (const id of ids) {
        const d = draftItems[id] || {};

        const patch = {
          title: (d.title || "").trim(),
          subtitle: (d.subtitle || "").trim() || null,
          description: (d.description || "").trim() || null,
          project_url: (d.project_url || "").trim() || null,
          repo_url: (d.repo_url || "").trim() || null,
          results: toLines(d.resultsText),
          tags: toTags(d.tagsText),
          is_featured: !!d.is_featured,
          is_published: !!d.is_published,
        };

        if (!patch.title) throw new Error("Title is required (cannot be empty).");

        const { data, error: updErr } = await supabase
          .from("portfolio_items")
          .update(patch)
          .eq("id", id)
          .select("*")
          .single();

        if (updErr) throw updErr;
        updatedRows.push(data);
      }

      setItems((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        for (const row of updatedRows) map.set(row.id, row);
        return Array.from(map.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });

      // clear dirty set
      setDirtyIds(new Set());
      toast("Saved changes.");
      success({ title: "Changes saved", message: "Portfolio updates were applied." });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
      setBusy(false);
    }
  };

  // Attempt signed urls for currently loaded media (helps private bucket)
  useEffect(() => {
    const paths = (media || []).map((m) => m.file_path).filter(Boolean);
    if (paths.length) ensureSignedUrls(paths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  const dirtyCount = dirtyIds.size;

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Portfolio editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Portfolio — Work Samples</h1>
            <div className="small text-muted">
              CRUD items, feature toggle, reorder, and upload screenshots/videos to Supabase bucket{" "}
              <code>{BUCKET}</code>.
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreview}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>

            {/* ✅ Save button group */}
            <button
              className="btn btn-success"
              onClick={saveChanges}
              disabled={busy || saving || dirtyCount === 0}
              title={dirtyCount ? "Save your edited items" : "No changes to save"}
            >
              <i className="fa-solid fa-floppy-disk me-2"></i>
              {saving ? "Saving..." : dirtyCount ? `Save Changes (${dirtyCount})` : "Saved"}
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={discardChanges}
              disabled={busy || saving || dirtyCount === 0}
              title="Revert unsaved edits"
            >
              <i className="fa-solid fa-rotate-left me-2"></i>Discard
            </button>

            <button className="btn btn-outline-primary" onClick={() => router.push("/admin")}>
              <i className="fa-solid fa-arrow-left me-2"></i>Dashboard
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger py-2" style={{ whiteSpace: "pre-wrap" }}>
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

        <AdminStepper>
          <AdminStep title="Add Portfolio Item" description="Create a new project entry.">
            {/* Add Item */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Portfolio Item</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Title *</label>
                <input className="form-control" value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Subtitle</label>
                <input className="form-control" value={newItem.subtitle} onChange={(e) => setNewItem((p) => ({ ...p, subtitle: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-control" value={newItem.tagsText} onChange={(e) => setNewItem((p) => ({ ...p, tagsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="3" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Project URL</label>
                <input className="form-control" value={newItem.project_url} onChange={(e) => setNewItem((p) => ({ ...p, project_url: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Repo URL</label>
                <input className="form-control" value={newItem.repo_url} onChange={(e) => setNewItem((p) => ({ ...p, repo_url: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Results / Metrics (one per line)</label>
                <textarea className="form-control" rows="3" value={newItem.resultsText} onChange={(e) => setNewItem((p) => ({ ...p, resultsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12">
                <label className="form-label">Upload Media (for this new item)</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*,video/mp4"
                  multiple
                  disabled={busy}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const { ok, bad } = validateFiles(files);
                    if (bad.length) setError(`Some files were skipped:\n- ${bad.join("\n- ")}`);
                    setNewItemFiles(ok);
                  }}
                />
                <div className="form-text">
                  Selected files upload right after you click <b>Add Portfolio Item</b>. Bucket:{" "}
                  <code>{BUCKET}</code> under <code>portfolio/&lt;newId&gt;/</code>
                </div>
                {newItemFiles.length ? <div className="small text-muted mt-1">Selected: {newItemFiles.length} file(s)</div> : null}
              </div>

              <div className="col-6">
                <div className="form-check mt-2">
                  <input className="form-check-input" type="checkbox" checked={!!newItem.is_featured} onChange={(e) => setNewItem((p) => ({ ...p, is_featured: e.target.checked }))} disabled={busy} id="newFeat" />
                  <label className="form-check-label" htmlFor="newFeat">Featured</label>
                </div>
              </div>

              <div className="col-6">
                <div className="form-check mt-2">
                  <input className="form-check-input" type="checkbox" checked={!!newItem.is_published} onChange={(e) => setNewItem((p) => ({ ...p, is_published: e.target.checked }))} disabled={busy} id="newPub" />
                  <label className="form-check-label" htmlFor="newPub">Published</label>
                </div>
              </div>

              <div className="col-12 d-grid mt-2">
                <button className="btn btn-primary" onClick={createItem} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add Portfolio Item
                </button>
              </div>
            </div>
          </div>
        </div>

          </AdminStep>

          <AdminStep title="Manage Items" description="Edit details, media, and publish status.">
            {/* Items */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Items</h2>

            {!items.length ? <div className="text-muted">No portfolio items yet.</div> : null}

            <div className="vstack gap-3">
              {items.map((it) => {
                const list = mediaByItem[it.id] || [];
                const cover = list.find((m) => m.media_type === "image") || list[0];
                const coverUrl = cover ? publicUrl(cover.file_path) : "";

                const showProgress = uploadingFor === it.id && uploadProgress.total > 0;
                const pct = showProgress ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0;

                const d = draftItems[it.id] || {
                  title: it.title || "",
                  subtitle: it.subtitle || "",
                  description: it.description || "",
                  project_url: it.project_url || "",
                  repo_url: it.repo_url || "",
                  resultsText: fromArr(it.results),
                  tagsText: fromTags(it.tags),
                  is_featured: !!it.is_featured,
                  is_published: !!it.is_published,
                };

                return (
                  <div key={it.id} className="border rounded bg-white p-3">
                    <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                      <div className="d-flex gap-3">
                        <div style={{ width: 120, height: 80 }} className="border rounded overflow-hidden bg-light d-flex align-items-center justify-content-center">
                          {coverUrl ? (
                            <img src={coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span className="text-muted small">No media</span>
                          )}
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {it.title}{" "}
                            {d.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
                            {d.is_published ? <span className="badge text-bg-success ms-2">Published</span> : <span className="badge text-bg-secondary ms-2">Hidden</span>}
                            {dirtyIds.has(it.id) ? <span className="badge text-bg-info ms-2">Unsaved</span> : null}
                          </div>
                          <div className="text-muted small">Order: {it.sort_order} • Media: {list.length}</div>
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

                    {showProgress ? (
                      <div className="mt-3">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>Uploading… ({uploadProgress.done}/{uploadProgress.total})</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
                          <div className="progress-bar" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    ) : null}

                    <div className="row g-2 mt-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Title</label>
                        <input className="form-control" value={d.title} onChange={(e) => setDraft(it.id, { title: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Subtitle</label>
                        <input className="form-control" value={d.subtitle} onChange={(e) => setDraft(it.id, { subtitle: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Tags</label>
                        <input className="form-control" value={d.tagsText} onChange={(e) => setDraft(it.id, { tagsText: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="3" value={d.description} onChange={(e) => setDraft(it.id, { description: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Project URL</label>
                        <input className="form-control" value={d.project_url} onChange={(e) => setDraft(it.id, { project_url: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Repo URL</label>
                        <input className="form-control" value={d.repo_url} onChange={(e) => setDraft(it.id, { repo_url: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Results/Metrics</label>
                        <textarea className="form-control" rows="3" value={d.resultsText} onChange={(e) => setDraft(it.id, { resultsText: e.target.value })} disabled={busy} />
                      </div>

                      <div className="col-6">
                        <div className="form-check mt-2">
                          <input className="form-check-input" type="checkbox" checked={!!d.is_featured} onChange={(e) => setDraft(it.id, { is_featured: e.target.checked })} disabled={busy} id={`feat_${it.id}`} />
                          <label className="form-check-label" htmlFor={`feat_${it.id}`}>Featured</label>
                        </div>
                      </div>

                      <div className="col-6">
                        <div className="form-check mt-2">
                          <input className="form-check-input" type="checkbox" checked={!!d.is_published} onChange={(e) => setDraft(it.id, { is_published: e.target.checked })} disabled={busy} id={`pub_${it.id}`} />
                          <label className="form-check-label" htmlFor={`pub_${it.id}`}>Published</label>
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label mt-2">Upload Media (multi-select)</label>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*,video/mp4"
                          multiple
                          disabled={busy}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length) await uploadFiles(it.id, files);
                            e.target.value = "";
                          }}
                        />
                        <div className="form-text">
                          Uploads to bucket <code>{BUCKET}</code> under <code>portfolio/{it.id}/</code>. Allowed:{" "}
                          <code>{ACCEPTED_EXT.join(", ")}</code>. Max: <code>{MAX_FILE_MB}MB</code>.
                        </div>
                      </div>

                      {list.length ? (
                        <div className="col-12">
                          <div className="mt-3">
                            <div className="fw-semibold mb-2">Media</div>
                            <div className="row g-2">
                              {list.map((m) => {
                                const url = publicUrl(m.file_path);
                                return (
                                  <div className="col-12 col-md-6 col-lg-4" key={m.id}>
                                    <div className="border rounded p-2 h-100">
                                      <div className="ratio ratio-16x9 bg-light rounded overflow-hidden">
                                        {m.media_type === "video" ? (
                                          <video src={url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                          <img src={url} alt={m.alt || "media"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        )}
                                      </div>

                                      <div className="mt-2">
                                        <input className="form-control form-control-sm mb-2" placeholder="Alt text" defaultValue={m.alt || ""} onBlur={(e) => updateMedia(m.id, { alt: e.target.value.trim() || null })} disabled={busy} />
                                        <input className="form-control form-control-sm mb-2" placeholder="Caption" defaultValue={m.caption || ""} onBlur={(e) => updateMedia(m.id, { caption: e.target.value.trim() || null })} disabled={busy} />

                                        <div className="d-flex flex-wrap gap-2 align-items-center">
                                          <div className="form-check">
                                            <input className="form-check-input" type="checkbox" defaultChecked={!!m.is_published} onChange={(e) => updateMedia(m.id, { is_published: e.target.checked })} disabled={busy} id={`m_pub_${m.id}`} />
                                            <label className="form-check-label small" htmlFor={`m_pub_${m.id}`}>Published</label>
                                          </div>

                                          <button className="btn btn-sm btn-outline-secondary" onClick={() => moveMedia(it.id, m.id, "up")} disabled={busy}>
                                            <i className="fa-solid fa-arrow-up"></i>
                                          </button>
                                          <button className="btn btn-sm btn-outline-secondary" onClick={() => moveMedia(it.id, m.id, "down")} disabled={busy}>
                                            <i className="fa-solid fa-arrow-down"></i>
                                          </button>

                                          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => deleteMedia(m)} disabled={busy}>
                                            <i className="fa-solid fa-trash"></i>
                                          </button>
                                        </div>

                                        <div className="small text-muted mt-1">Order: {m.sort_order}</div>
                                        <div className="small text-muted mt-1">
                                          <code style={{ fontSize: 12 }}>{m.file_path}</code>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

          </AdminStep>
        </AdminStepper>

        <div className="small text-muted mt-3">
          Tip: If previews show broken images, your bucket may be <b>private</b>. This page already attempts signed URLs,
          but you must ensure your Storage policies allow signed URL creation for authenticated users.
        </div>
      </div>
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
