// src/app/admin/tools/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";
import AdminStepper, { AdminStep } from "@/components/admin/AdminStepper";

const emptyTool = {
  name: "",
  category: "",
  description: "",
  icon: "",
  url: "",
  is_published: true,
};

const ICON_LIBRARY = [
  { value: "fa-solid fa-screwdriver-wrench", label: "Wrench" },
  { value: "fa-solid fa-toolbox", label: "Toolbox" },
  { value: "fa-solid fa-gear", label: "Gear" },
  { value: "fa-solid fa-sliders", label: "Sliders" },
  { value: "fa-solid fa-bolt", label: "Bolt" },
  { value: "fa-solid fa-wand-magic-sparkles", label: "Magic" },
  { value: "fa-solid fa-pen-nib", label: "Pen" },
  { value: "fa-solid fa-clipboard-check", label: "Checklist" },
  { value: "fa-solid fa-calendar-check", label: "Calendar" },
  { value: "fa-solid fa-chart-line", label: "Chart Line" },
  { value: "fa-solid fa-chart-pie", label: "Chart Pie" },
  { value: "fa-solid fa-diagram-project", label: "Diagram" },
  { value: "fa-solid fa-code", label: "Code" },
  { value: "fa-solid fa-terminal", label: "Terminal" },
  { value: "fa-solid fa-database", label: "Database" },
  { value: "fa-solid fa-cloud", label: "Cloud" },
  { value: "fa-solid fa-folder-tree", label: "Folder Tree" },
  { value: "fa-solid fa-file-lines", label: "File" },
  { value: "fa-solid fa-comments", label: "Chat" },
  { value: "fa-solid fa-envelope-open-text", label: "Email" },
];

const normalizeText = (v) => String(v || "").trim();

const resolveIcon = (icon) => {
  const raw = String(icon || "").trim();
  if (!raw) return "fa-solid fa-screwdriver-wrench";
  if (/(^|\s)fa-(solid|regular|brands|light|thin|duotone)\b/.test(raw)) return raw;
  if (raw.startsWith("fa-")) return `fa-solid ${raw}`;
  return `fa-solid fa-${raw}`;
};

const normalizeIcon = (icon) => resolveIcon(icon);

const IconPicker = ({ value, onSelect }) => {
  const normalized = normalizeIcon(value);

  return (
    <div className="d-flex flex-wrap gap-2">
      {ICON_LIBRARY.map((icon) => {
        const active = normalized === normalizeIcon(icon.value);
        return (
          <button
            key={icon.value}
            type="button"
            className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-secondary"}`}
            title={icon.label}
            onClick={() => onSelect(icon.value)}
          >
            <i className={icon.value} aria-hidden="true"></i>
          </button>
        );
      })}
    </div>
  );
};

export default function AdminToolsPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ ...emptyTool });

  const [toolDrafts, setToolDrafts] = useState({});
  const [dirty, setDirty] = useState(false);

  const toKey = (v) => String(v ?? "");

  const buildDrafts = (list) => {
    const drafts = {};
    for (const it of list || []) {
      drafts[toKey(it.id)] = {
        name: it.name || "",
        category: it.category || "",
        description: it.description || "",
        icon: it.icon || "",
        url: it.url || "",
        is_published: !!it.is_published,
      };
    }
    return drafts;
  };

  const toast = (msg) => {
    setNotice(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setNotice(""), 2500);
  };

  const itemsSorted = useMemo(() => {
    return (items || []).slice().sort((a, b) => {
      const ao = a.sort_order || 0;
      const bo = b.sort_order || 0;
      if (ao !== bo) return ao - bo;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  }, [items]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);
      setError("");
      setNotice("");

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/tools");
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
    const { data, error: loadErr } = await supabase
      .from("tool_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!mountedRef.current) return;

    if (loadErr) {
      setError(loadErr.message || "Failed to load tools.");
      return;
    }

    const nextItems = data || [];
    setItems(nextItems);
    setToolDrafts(buildDrafts(nextItems));
    setDirty(false);
  };

  const createTool = async () => {
    const ok = await confirm({
      title: "Add tool?",
      message: "This will create a new tool item.",
      confirmText: "Add",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const name = normalizeText(newItem.name);
      if (!name) throw new Error("Tool name is required.");

      const maxOrder = items.length ? Math.max(...items.map((i) => i.sort_order || 0)) : 0;

      const payload = {
        name,
        category: normalizeText(newItem.category) || null,
        description: normalizeText(newItem.description) || null,
        icon: normalizeText(newItem.icon) || null,
        url: normalizeText(newItem.url) || null,
        is_published: !!newItem.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("tool_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;
      if (!mountedRef.current) return;

      setItems((prev) =>
        [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      );

      setNewItem({ ...emptyTool });
      setToolDrafts((prev) => ({
        ...prev,
        [toKey(data.id)]: {
          name: data.name || "",
          category: data.category || "",
          description: data.description || "",
          icon: data.icon || "",
          url: data.url || "",
          is_published: !!data.is_published,
        },
      }));

      toast("Tool created.");
      success({ title: "Tool added", message: "The tool was created successfully." });
    } catch (e) {
      setError(e.message || "Create tool failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteTool = async (id) => {
    const ok = await confirm({
      title: "Delete tool?",
      message: "This will permanently remove the tool.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("tool_items").delete().eq("id", id);
      if (delErr) throw delErr;
      if (!mountedRef.current) return;

      setItems((prev) => prev.filter((i) => i.id !== id));
      setToolDrafts((prev) => {
        const next = { ...prev };
        delete next[toKey(id)];
        return next;
      });
      toast("Tool deleted.");
      success({ title: "Tool deleted", message: "The tool was removed." });
    } catch (e) {
      setError(e.message || "Delete tool failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveTool = async (id, dir) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;

    const list = itemsSorted;
    const idx = list.findIndex((x) => x.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const [ua, ub] = await Promise.all([
        supabase.from("tool_items").update({ sort_order: b.sort_order }).eq("id", a.id).select("*").single(),
        supabase.from("tool_items").update({ sort_order: a.sort_order }).eq("id", b.id).select("*").single(),
      ]);

      if (ua.error) throw ua.error;
      if (ub.error) throw ub.error;
      if (!mountedRef.current) return;

      setItems((prev) =>
        prev
          .map((x) => (x.id === a.id ? ua.data : x.id === b.id ? ub.data : x))
          .sort((p, q) => (p.sort_order || 0) - (q.sort_order || 0))
      );

      toast("Tool reordered.");
    } catch (e) {
      setError(e.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    const ok = await confirm({
      title: "Save changes?",
      message: "Apply your edits to the tools list.",
      confirmText: "Save",
      confirmVariant: "success",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const updates = [];
      for (const it of itemsSorted) {
        const d = toolDrafts[toKey(it.id)];
        if (!d) continue;

        const patch = {};
        const nextName = normalizeText(d.name);
        const nextCategory = normalizeText(d.category);
        const nextDescription = normalizeText(d.description);
        const nextIcon = normalizeText(d.icon);
        const nextUrl = normalizeText(d.url);
        const nextPub = !!d.is_published;

        if (!nextName) throw new Error("Tool name is required.");

        if (nextName !== normalizeText(it.name)) patch.name = nextName;
        if (nextCategory !== normalizeText(it.category)) patch.category = nextCategory || null;
        if (nextDescription !== normalizeText(it.description)) patch.description = nextDescription || null;
        if (nextIcon !== normalizeText(it.icon)) patch.icon = nextIcon || null;
        if (nextUrl !== normalizeText(it.url)) patch.url = nextUrl || null;
        if (nextPub !== !!it.is_published) patch.is_published = nextPub;

        if (Object.keys(patch).length) updates.push({ id: it.id, patch });
      }

      if (!updates.length) {
        toast("No changes to save.");
        setDirty(false);
        return;
      }

      for (const u of updates) {
        const { data, error: updErr } = await supabase
          .from("tool_items")
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

      toast("Saved.");
      setDirty(false);
      success({ title: "Changes saved", message: "Tool updates were applied." });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const discardChanges = async () => {
    if (!dirty) return;
    const ok = await confirm({
      title: "Discard changes?",
      message: "You have unsaved changes. Discard them?",
      confirmText: "Discard",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setToolDrafts(buildDrafts(itemsSorted));
    setDirty(false);
    toast("Changes discarded.");
  };

  const requestReload = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Reload tools?",
        message: "You have unsaved changes. Discard them and reload from the database?",
        confirmText: "Reload",
        confirmVariant: "danger",
      });
      if (!ok) return;
    }
    await reloadAll();
  };

  const openPreview = () => window.open("/#tools", "_blank");

  const BadgePub = ({ pub }) =>
    pub ? (
      <span className="badge text-bg-success">Published</span>
    ) : (
      <span className="badge text-bg-secondary">Hidden</span>
    );

  const onChangeToolDraft = (id, patch) => {
    const k = toKey(id);
    setToolDrafts((prev) => ({
      ...prev,
      [k]: { ...(prev[k] || {}), ...patch },
    }));
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Tools editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Tools</h1>
            <div className="small text-muted">Add, reorder, and publish the tools you use.</div>
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

        <AdminStepper>
          <AdminStep title="Add Tool" description="Create a new tool entry.">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">Add Tool</h2>
                <div className="row g-2 align-items-end">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      placeholder='e.g. "Notion", "Figma", "Slack"'
                      value={newItem.name}
                      onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">Use the exact tool name clients will recognize.</div>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">Category (optional)</label>
                    <input
                      className="form-control"
                      placeholder='e.g. "Project Management"'
                      value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">Use a short label to group similar tools.</div>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">Icon (optional)</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className={resolveIcon(newItem.icon)} aria-hidden="true"></i>
                      </span>
                      <input
                        className="form-control"
                        placeholder='e.g. "fa-solid fa-toolbox"'
                        value={newItem.icon}
                        onChange={(e) => setNewItem((p) => ({ ...p, icon: e.target.value }))}
                        disabled={busy}
                      />
                    </div>
                    <div className="form-text">Pick an icon below or type a Font Awesome class.</div>
                  </div>

                  <div className="col-12 col-md-2">
                    <div className="form-check mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!!newItem.is_published}
                        onChange={(e) => setNewItem((p) => ({ ...p, is_published: e.target.checked }))}
                        disabled={busy}
                        id="newToolPub"
                      />
                      <label className="form-check-label" htmlFor="newToolPub">
                        Publish
                      </label>
                      <div className="form-text">Show this tool on your site.</div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Description (optional)</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Documentation, knowledge base, and team wiki"
                      value={newItem.description}
                      onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">One short sentence describing how you use it.</div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Website (optional)</label>
                    <input
                      className="form-control"
                      placeholder="https://example.com"
                      value={newItem.url}
                      onChange={(e) => setNewItem((p) => ({ ...p, url: e.target.value }))}
                      disabled={busy}
                    />
                    <div className="form-text">Add a link to the tool's website.</div>
                  </div>

                  <div className="col-12 col-md-2 d-grid">
                    <button className="btn btn-primary" onClick={createTool} disabled={busy}>
                      <i className="fa-solid fa-plus me-2"></i>Add
                    </button>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Icon Gallery</label>
                    <IconPicker
                      value={newItem.icon}
                      onSelect={(icon) => setNewItem((p) => ({ ...p, icon }))}
                    />
                    <div className="form-text">Click an icon to fill the icon field.</div>
                  </div>
                </div>
              </div>
            </div>
          </AdminStep>

          <AdminStep title="Manage Tools" description="Edit, reorder, and save changes.">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
                  <h2 className="h6 mb-0">Tools</h2>

                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-outline-secondary" onClick={requestReload} disabled={busy} type="button">
                      <i className="fa-solid fa-rotate me-2"></i>Reload
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={discardChanges}
                      disabled={busy || !dirty}
                      type="button"
                    >
                      Discard
                    </button>
                    <button className="btn btn-primary" onClick={saveChanges} disabled={busy || !dirty} type="button">
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

                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span className="badge text-bg-light border text-muted">Tools: {itemsSorted.length}</span>
                  {dirty ? <span className="badge text-bg-warning">Unsaved</span> : null}
                </div>

                {itemsSorted.length === 0 ? (
                  <div className="text-muted">No tools yet.</div>
                ) : (
                  <div className="vstack gap-2">
                    {itemsSorted.map((it, idx) => {
                      const d = toolDrafts[toKey(it.id)] || {
                        name: it.name || "",
                        category: it.category || "",
                        description: it.description || "",
                        icon: it.icon || "",
                        url: it.url || "",
                        is_published: !!it.is_published,
                      };
                      const iconClass = resolveIcon(d.icon);

                      return (
                        <div className="card" key={toKey(it.id)}>
                          <div className="card-body">
                            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                              <div className="d-flex flex-wrap gap-2 align-items-center">
                                <div className="fw-semibold">
                                  <i className={`${iconClass} me-2 text-primary`} aria-hidden="true"></i>
                                  {d.name || "(Untitled tool)"}
                                </div>
                                <BadgePub pub={!!d.is_published} />
                                <span className="badge text-bg-light border text-muted">Position: {idx + 1}</span>
                              </div>

                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => moveTool(it.id, "up")}
                                  disabled={busy || idx === 0}
                                  type="button"
                                  title="Move up"
                                >
                                  <i className="fa-solid fa-arrow-up"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => moveTool(it.id, "down")}
                                  disabled={busy || idx === itemsSorted.length - 1}
                                  type="button"
                                  title="Move down"
                                >
                                  <i className="fa-solid fa-arrow-down"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteTool(it.id)}
                                  disabled={busy}
                                  type="button"
                                  title="Delete"
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </div>
                            </div>

                            <div className="row g-2 mt-2">
                              <div className="col-12 col-md-3">
                                <label className="form-label">Name</label>
                                <input
                                  className="form-control"
                                  placeholder='e.g. "Notion"'
                                  value={d.name}
                                  onChange={(e) => onChangeToolDraft(it.id, { name: e.target.value })}
                                  disabled={busy}
                                />
                                <div className="form-text">Short tool name.</div>
                              </div>

                              <div className="col-12 col-md-3">
                                <label className="form-label">Category</label>
                                <input
                                  className="form-control"
                                  placeholder='e.g. "Docs", "PM", "Design"'
                                  value={d.category}
                                  onChange={(e) => onChangeToolDraft(it.id, { category: e.target.value })}
                                  disabled={busy}
                                />
                                <div className="form-text">Optional grouping label.</div>
                              </div>

                              <div className="col-12 col-md-3">
                                <label className="form-label">Icon</label>
                                <div className="input-group">
                                  <span className="input-group-text">
                                    <i className={resolveIcon(d.icon)} aria-hidden="true"></i>
                                  </span>
                                  <input
                                    className="form-control"
                                    placeholder='e.g. "fa-solid fa-toolbox"'
                                    value={d.icon}
                                    onChange={(e) => onChangeToolDraft(it.id, { icon: e.target.value })}
                                    disabled={busy}
                                  />
                                </div>
                                <details className="mt-2">
                                  <summary className="small text-muted">Pick icon</summary>
                                  <div className="mt-2">
                                    <IconPicker
                                      value={d.icon}
                                      onSelect={(icon) => onChangeToolDraft(it.id, { icon })}
                                    />
                                  </div>
                                </details>
                              </div>

                              <div className="col-12 col-md-3">
                                <label className="form-label">Website</label>
                                <input
                                  className="form-control"
                                  placeholder="https://example.com"
                                  value={d.url}
                                  onChange={(e) => onChangeToolDraft(it.id, { url: e.target.value })}
                                  disabled={busy}
                                />
                                <div className="form-text">Optional link shown on the card.</div>
                              </div>

                              <div className="col-12 col-md-8">
                                <label className="form-label">Description</label>
                                <input
                                  className="form-control"
                                  placeholder="Short note about how you use this tool."
                                  value={d.description}
                                  onChange={(e) => onChangeToolDraft(it.id, { description: e.target.value })}
                                  disabled={busy}
                                />
                                <div className="form-text">Keep it concise (1 sentence).</div>
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label d-block">Published</label>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`toolPub_${toKey(it.id)}`}
                                    checked={!!d.is_published}
                                    onChange={(e) => onChangeToolDraft(it.id, { is_published: e.target.checked })}
                                    disabled={busy}
                                  />
                                  <label className="form-check-label" htmlFor={`toolPub_${toKey(it.id)}`}>
                                    Visible
                                  </label>
                                  <div className="form-text">Publish to show this tool.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </AdminStep>
        </AdminStepper>

        <div className="small text-muted mt-3">
          Tip: Reorder changes apply immediately. Field edits are saved only when you click <b>Save Changes</b>.
        </div>
      </div>
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
