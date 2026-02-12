"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

const emptyForm = {
  role_title: "",
  company: "",
  client: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  summary: "",
  responsibilitiesText: "",
  achievementsText: "",
  toolsText: "",
  tagsText: "",
  is_published: true,
};

const toLines = (text) =>
  (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const fromArray = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean)
    .join("\n");

const fromTags = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean)
    .join(", ");

const toTags = (text) =>
  (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export default function AdminExperiencePage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  // Draft edits + Save UX
  const [drafts, setDrafts] = useState({}); // { [id]: { ...patchFields } }
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const baselineRef = useRef({}); // { [id]: normalizedFields } used for discard + diff

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  };

  const normalizeItem = (it) => ({
    role_title: it.role_title || "",
    company: it.company || "",
    client: it.client || "",
    location: it.location || "",
    start_date: it.start_date || "",
    end_date: it.end_date || "",
    is_current: !!it.is_current,
    summary: it.summary || "",
    responsibilitiesText: fromArray(it.responsibilities),
    achievementsText: fromArray(it.achievements),
    toolsText: fromTags(it.tools),
    tagsText: fromTags(it.tags),
    is_published: !!it.is_published,
  });

  const computePatch = (base, draft) => {
    // Convert UI draft -> DB patch only for changed fields
    const patch = {};

    const role_title = (draft.role_title || "").trim();
    const company = (draft.company || "").trim();
    const client = (draft.client || "").trim();
    const location = (draft.location || "").trim();
    const summary = (draft.summary || "").trim();

    const start_date = draft.start_date || null;
    const is_current = !!draft.is_current;
    const end_date = is_current ? null : (draft.end_date || null);

    const responsibilities = toLines(draft.responsibilitiesText);
    const achievements = toLines(draft.achievementsText);
    const tools = toTags(draft.toolsText);
    const tags = toTags(draft.tagsText);
    const is_published = !!draft.is_published;

    // validate required
    if (!role_title) throw new Error("Role title is required.");

    if (role_title !== base.role_title) patch.role_title = role_title;
    if (company !== base.company) patch.company = company || null;
    if (client !== base.client) patch.client = client || null;
    if (location !== base.location) patch.location = location || null;

    if ((start_date || "") !== (base.start_date || "")) patch.start_date = start_date;
    if (is_current !== !!base.is_current) patch.is_current = is_current;

    // end_date: compare normalized
    const baseEnd = base.is_current ? "" : (base.end_date || "");
    const nextEnd = is_current ? "" : (draft.end_date || "");
    if (nextEnd !== baseEnd) patch.end_date = end_date;

    if (summary !== base.summary) patch.summary = summary || null;

    if ((draft.responsibilitiesText || "") !== (base.responsibilitiesText || "")) patch.responsibilities = responsibilities;
    if ((draft.achievementsText || "") !== (base.achievementsText || "")) patch.achievements = achievements;
    if ((draft.toolsText || "") !== (base.toolsText || "")) patch.tools = tools;
    if ((draft.tagsText || "") !== (base.tagsText || "")) patch.tags = tags;

    if (is_published !== !!base.is_published) patch.is_published = is_published;

    return patch;
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/experience");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("experience_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load experience.");
        setLoading(false);
        return;
      }

      const list = data || [];
      setItems(list);

      // build baseline for drafts
      const base = {};
      for (const it of list) base[it.id] = normalizeItem(it);
      baselineRef.current = base;

      setDrafts({});
      setDirtyIds(new Set());

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const dirtyCount = dirtyIds.size;

  const stage = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));

    const base = baselineRef.current[id] || {};
    const next = { ...base, ...(drafts[id] || {}), [field]: value };

    // quick dirty detection (compare only that field against base)
    const isDirtyField = (a, b) => (a ?? "") !== (b ?? "");
    let nowDirty = false;

    if (field === "is_current" || field === "is_published") {
      nowDirty = !!next[field] !== !!base[field];
    } else {
      nowDirty = isDirtyField(next[field], base[field]);
    }

    setDirtyIds((prevSet) => {
      const ns = new Set(prevSet);

      // re-check overall dirty for this id by comparing whole draft vs base
      const merged = { ...base, ...(drafts[id] || {}), [field]: value };
      const keys = Object.keys(base);
      const anyDirty = keys.some((k) => {
        if (k === "is_current" || k === "is_published") return !!merged[k] !== !!base[k];
        return (merged[k] ?? "") !== (base[k] ?? "");
      });

      if (anyDirty) ns.add(id);
      else ns.delete(id);

      return ns;
    });
  };

  const saveRow = async (id) => {
    const ok = await confirm({
      title: "Save changes?",
      message: "Apply updates to this experience item.",
      confirmText: "Save",
      confirmVariant: "success",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const base = baselineRef.current[id];
      if (!base) return;

      const merged = { ...base, ...(drafts[id] || {}) };
      const patch = computePatch(base, merged);

      if (!Object.keys(patch).length) {
        toast("No changes to save.");
        return;
      }

      const { data, error: updErr } = await supabase
        .from("experience_items")
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

      // refresh baseline for this row + clear its draft
      baselineRef.current[id] = normalizeItem(data);

      setDrafts((prev) => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });

      setDirtyIds((prevSet) => {
        const ns = new Set(prevSet);
        ns.delete(id);
        return ns;
      });

      toast("Saved.");
      success({ title: "Experience updated", message: "Your changes were saved." });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveAll = async () => {
    if (!dirtyIds.size) {
      toast("No changes to save.");
      return;
    }

    const ok = await confirm({
      title: "Save all changes?",
      message: "Apply updates to all edited experience items.",
      confirmText: "Save all",
      confirmVariant: "success",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const ids = Array.from(dirtyIds);

      // Validate + compute patches first (fail fast)
      const payloads = [];
      for (const id of ids) {
        const base = baselineRef.current[id];
        if (!base) continue;
        const merged = { ...base, ...(drafts[id] || {}) };
        const patch = computePatch(base, merged);
        if (Object.keys(patch).length) payloads.push({ id, patch });
      }

      // Apply sequentially (keeps it simple + consistent errors)
      for (const row of payloads) {
        const { data, error: updErr } = await supabase
          .from("experience_items")
          .update(row.patch)
          .eq("id", row.id)
          .select("*")
          .single();
        if (updErr) throw updErr;

        // update local items + baseline for each saved row
        setItems((prev) =>
          prev
            .map((x) => (x.id === row.id ? data : x))
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        );
        baselineRef.current[row.id] = normalizeItem(data);
      }

      // clear drafts for saved ids
      setDrafts((prev) => {
        const cp = { ...prev };
        ids.forEach((id) => delete cp[id]);
        return cp;
      });
      setDirtyIds(new Set());

      toast("All changes saved.");
      success({ title: "Changes saved", message: "All experience updates were applied." });
    } catch (e) {
      setError(e.message || "Save all failed.");
    } finally {
      setBusy(false);
    }
  };

  const discardAll = () => {
    setDrafts({});
    setDirtyIds(new Set());
    toast("Changes discarded.");
  };

  const createItem = async () => {
    const ok = await confirm({
      title: "Add experience?",
      message: "This will add a new experience item.",
      confirmText: "Add",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!form.role_title.trim()) throw new Error("Role title is required.");

      const maxOrder = items.length ? Math.max(...items.map((x) => x.sort_order || 0)) : 0;

      const payload = {
        role_title: form.role_title.trim(),
        company: form.company.trim() || null,
        client: form.client.trim() || null,
        location: form.location.trim() || null,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : (form.end_date || null),
        is_current: !!form.is_current,
        summary: form.summary.trim() || null,
        responsibilities: toLines(form.responsibilitiesText),
        achievements: toLines(form.achievementsText),
        tools: toTags(form.toolsText),
        tags: toTags(form.tagsText),
        is_published: !!form.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("experience_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      setItems((prev) => [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

      // update baseline for newly created row
      baselineRef.current[data.id] = normalizeItem(data);

      setForm({ ...emptyForm, is_published: true });
      toast("Experience added.");
      success({ title: "Experience added", message: "The new item was created successfully." });
    } catch (e) {
      setError(e.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    const ok = await confirm({
      title: "Delete experience item?",
      message: "This will permanently remove the item.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("experience_items").delete().eq("id", id);
      if (delErr) throw delErr;

      setItems((prev) => prev.filter((x) => x.id !== id));

      // clear baseline/drafts
      const base = { ...baselineRef.current };
      delete base[id];
      baselineRef.current = base;

      setDrafts((prev) => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });

      setDirtyIds((prevSet) => {
        const ns = new Set(prevSet);
        ns.delete(id);
        return ns;
      });

      toast("Deleted.");
      success({ title: "Experience deleted", message: "The item was removed." });
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

    // if there are unsaved drafts, keep it simple: force save/discard first
    if (dirtyIds.size) {
      setError("You have unsaved changes. Please Save or Discard before reordering.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const a = items[idx];
      const b = items[swapWith];

      const { data: aRes, error: e1 } = await supabase
        .from("experience_items")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id)
        .select("*")
        .single();
      if (e1) throw e1;

      const { data: bRes, error: e2 } = await supabase
        .from("experience_items")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id)
        .select("*")
        .single();
      if (e2) throw e2;

      const next = items
        .map((x) => (x.id === a.id ? aRes : x.id === b.id ? bRes : x))
        .sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0));

      setItems(next);

      // baseline refresh
      baselineRef.current[a.id] = normalizeItem(aRes);
      baselineRef.current[b.id] = normalizeItem(bRes);

      toast("Reordered.");
    } catch (e) {
      setError(e.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = () => window.open("/experience#experience", "_blank");

  const mergedDraft = (it) => {
    const base = baselineRef.current[it.id] || normalizeItem(it);
    const d = drafts[it.id] || {};
    return { ...base, ...d };
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Experience editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Work Experience</h1>
            <div className="small text-muted">
              Timeline entries with responsibilities, achievements, tools, tags, and order.
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap align-items-center">
            {/* Global Save/Discard */}
            <button
              className="btn btn-success"
              onClick={saveAll}
              disabled={busy || !dirtyCount}
              title={!dirtyCount ? "No changes to save" : "Save all edited items"}
            >
              <i className="fa-solid fa-floppy-disk me-2"></i>
              Save Changes {dirtyCount ? `(${dirtyCount})` : ""}
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={discardAll}
              disabled={busy || !dirtyCount}
              title={!dirtyCount ? "No changes to discard" : "Discard all unsaved edits"}
            >
              <i className="fa-solid fa-rotate-left me-2"></i>Discard
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

        {/* Add Form */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Experience</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Role Title *</label>
                <input
                  className="form-control"
                  value={form.role_title}
                  onChange={(e) => setForm((p) => ({ ...p, role_title: e.target.value }))}
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
              <div className="col-12 col-md-4">
                <label className="form-label">Client (optional)</label>
                <input
                  className="form-control"
                  value={form.client}
                  onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Location</label>
                <input
                  className="form-control"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">Start Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">End Date</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  disabled={busy || form.is_current}
                />
              </div>

              <div className="col-12 col-md-2">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.is_current}
                    onChange={(e) => setForm((p) => ({ ...p, is_current: e.target.checked }))}
                    disabled={busy}
                    id="isCurrent"
                  />
                  <label className="form-check-label" htmlFor="isCurrent">
                    Current
                  </label>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Summary</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={form.summary}
                  onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Responsibilities (one per line)</label>
                <textarea
                  className="form-control"
                  rows="5"
                  value={form.responsibilitiesText}
                  onChange={(e) => setForm((p) => ({ ...p, responsibilitiesText: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Achievements (one per line)</label>
                <textarea
                  className="form-control"
                  rows="5"
                  value={form.achievementsText}
                  onChange={(e) => setForm((p) => ({ ...p, achievementsText: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tools (comma-separated)</label>
                <input
                  className="form-control"
                  value={form.toolsText}
                  onChange={(e) => setForm((p) => ({ ...p, toolsText: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  className="form-control"
                  value={form.tagsText}
                  onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-6">
                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!form.is_published}
                    onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                    disabled={busy}
                    id="newExpPub"
                  />
                  <label className="form-check-label" htmlFor="newExpPub">
                    Published
                  </label>
                </div>
              </div>

              <div className="col-6 d-grid mt-3">
                <button className="btn btn-primary" onClick={createItem} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add Experience
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Timeline Items</h2>

            {!items.length ? <div className="text-muted">No items yet.</div> : null}

            <div className="vstack gap-2">
              {items.map((it) => {
                const v = mergedDraft(it);
                const isDirty = dirtyIds.has(it.id);

                return (
                  <div key={it.id} className="border rounded bg-white p-3">
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                      <div className="fw-semibold">
                        {it.role_title}
                        <span className="text-muted fw-normal">
                          {" "}
                          {it.company ? `• ${it.company}` : ""}
                        </span>
                      </div>

                      <div className="d-flex gap-2 align-items-center">
                        {it.is_published ? (
                          <span className="badge text-bg-success">Published</span>
                        ) : (
                          <span className="badge text-bg-secondary">Hidden</span>
                        )}
                        <span className="text-muted small">Order: {it.sort_order}</span>
                      </div>
                    </div>

                    <div className="text-muted small mt-1">
                      {it.start_date ? it.start_date : "—"} →{" "}
                      {it.is_current ? "Present" : (it.end_date || "—")}
                      {it.location ? ` • ${it.location}` : ""}
                    </div>

                    {/* Row Save bar */}
                    <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
                      {isDirty ? (
                        <span className="badge text-bg-warning">
                          <i className="fa-solid fa-pen-to-square me-1"></i>Unsaved changes
                        </span>
                      ) : (
                        <span className="badge text-bg-light text-dark">
                          <i className="fa-solid fa-circle-check me-1"></i>Saved
                        </span>
                      )}

                      <button
                        className="btn btn-sm btn-success ms-auto"
                        onClick={() => saveRow(it.id)}
                        disabled={busy || !isDirty}
                        title={!isDirty ? "No changes to save" : "Save this item"}
                      >
                        <i className="fa-solid fa-floppy-disk me-2"></i>Save
                      </button>
                    </div>

                    <div className="row g-2 mt-2">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Role</label>
                        <input
                          className="form-control"
                          value={v.role_title}
                          onChange={(e) => stage(it.id, "role_title", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Company</label>
                        <input
                          className="form-control"
                          value={v.company}
                          onChange={(e) => stage(it.id, "company", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Client</label>
                        <input
                          className="form-control"
                          value={v.client}
                          onChange={(e) => stage(it.id, "client", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Location</label>
                        <input
                          className="form-control"
                          value={v.location}
                          onChange={(e) => stage(it.id, "location", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-6 col-md-3">
                        <label className="form-label">Start Date</label>
                        <input
                          className="form-control"
                          type="date"
                          value={v.start_date}
                          onChange={(e) => stage(it.id, "start_date", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-6 col-md-3">
                        <label className="form-label">End Date</label>
                        <input
                          className="form-control"
                          type="date"
                          value={v.end_date}
                          onChange={(e) => stage(it.id, "end_date", e.target.value)}
                          disabled={busy || v.is_current}
                        />
                      </div>

                      <div className="col-12 col-md-2">
                        <div className="form-check mt-4">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={!!v.is_current}
                            onChange={(e) => stage(it.id, "is_current", e.target.checked)}
                            disabled={busy}
                            id={`cur_${it.id}`}
                          />
                          <label className="form-check-label" htmlFor={`cur_${it.id}`}>
                            Current
                          </label>
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Summary</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={v.summary}
                          onChange={(e) => stage(it.id, "summary", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Responsibilities (one per line)</label>
                        <textarea
                          className="form-control"
                          rows="5"
                          value={v.responsibilitiesText}
                          onChange={(e) => stage(it.id, "responsibilitiesText", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Achievements (one per line)</label>
                        <textarea
                          className="form-control"
                          rows="5"
                          value={v.achievementsText}
                          onChange={(e) => stage(it.id, "achievementsText", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Tools (comma-separated)</label>
                        <input
                          className="form-control"
                          value={v.toolsText}
                          onChange={(e) => stage(it.id, "toolsText", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Tags (comma-separated)</label>
                        <input
                          className="form-control"
                          value={v.tagsText}
                          onChange={(e) => stage(it.id, "tagsText", e.target.value)}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12">
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={!!v.is_published}
                              onChange={(e) => stage(it.id, "is_published", e.target.checked)}
                              disabled={busy}
                              id={`pub_${it.id}`}
                            />
                            <label className="form-check-label" htmlFor={`pub_${it.id}`}>
                              Published
                            </label>
                          </div>

                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveItem(it.id, "up")}
                            disabled={busy}
                          >
                            <i className="fa-solid fa-arrow-up me-2"></i>Move up
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveItem(it.id, "down")}
                            disabled={busy}
                          >
                            <i className="fa-solid fa-arrow-down me-2"></i>Move down
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger ms-auto"
                            onClick={() => deleteItem(it.id)}
                            disabled={busy}
                          >
                            <i className="fa-solid fa-trash me-2"></i>Delete
                          </button>
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
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
