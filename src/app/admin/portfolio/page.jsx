"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

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

export default function AdminPortfolioPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState([]);
  const [media, setMedia] = useState([]);

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
    let alive = true;

    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/portfolio");
        return;
      }
      await reloadAll(alive);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2200);
  };

  const reloadAll = async (alive = true) => {
    setError("");
    const { data: itData, error: itErr } = await supabase
      .from("portfolio_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!alive) return;
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

    if (!alive) return;
    if (mErr) {
      setError(mErr.message || "Failed to load portfolio media.");
      setLoading(false);
      return;
    }

    setItems(itData || []);
    setMedia(mData || []);
    setLoading(false);
  };

  // ---------- ITEMS ----------
  const createItem = async () => {
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

      const { data, error: insErr } = await supabase
        .from("portfolio_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      setItems((prev) => [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
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

      toast("Portfolio item created.");
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
        .from("portfolio_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setItems((prev) => prev.map((x) => (x.id === id ? data : x)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      toast("Item updated.");
    } catch (e) {
      setError(e.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this portfolio item? This also deletes its media records.")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("portfolio_items").delete().eq("id", id);
      if (delErr) throw delErr;

      setItems((prev) => prev.filter((x) => x.id !== id));
      setMedia((prev) => prev.filter((m) => m.portfolio_id !== id));
      toast("Item deleted.");
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

  // ---------- MEDIA ----------
  const uploadFiles = async (portfolioId, files) => {
    if (!portfolioId) throw new Error("portfolioId required.");
    if (!files || !files.length) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // Determine starting sort_order for this portfolio's media
      const list = media.filter((m) => m.portfolio_id === portfolioId);
      let nextOrder = list.length ? Math.max(...list.map((m) => m.sort_order || 0)) + 10 : 10;

      const uploads = [];
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const safeExt = ["png", "jpg", "jpeg", "webp", "gif", "mp4"].includes(ext) ? ext : "png";
        const filename = `${crypto.randomUUID()}.${safeExt}`;
        const path = `portfolio/${portfolioId}/${filename}`;

        const { error: upErr } = await supabase.storage
          .from("portfolio-media")
          .upload(path, file, { upsert: false });

        if (upErr) throw upErr;

        const mediaType = safeExt === "mp4" ? "video" : "image";

        uploads.push({
          portfolio_id: portfolioId,
          file_path: path,
          media_type: mediaType,
          sort_order: nextOrder,
          is_published: true,
        });

        nextOrder += 10;
      }

      const { data, error: insErr } = await supabase
        .from("portfolio_media")
        .insert(uploads)
        .select("*");

      if (insErr) throw insErr;

      setMedia((prev) => [...prev, ...(data || [])]);
      toast("Uploaded media.");
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
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
    if (!confirm("Delete this media item? (Also removes file in Storage)")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // delete from storage first
      const { error: stErr } = await supabase.storage.from("portfolio-media").remove([m.file_path]);
      if (stErr) throw stErr;

      const { error: delErr } = await supabase.from("portfolio_media").delete().eq("id", m.id);
      if (delErr) throw delErr;

      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      toast("Media deleted.");
    } catch (e) {
      setError(e.message || "Media delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveMedia = async (portfolioId, mediaId, dir) => {
    const list = (mediaByItem[portfolioId] || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
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

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  const openPreview = () => window.open("/#portfolio", "_blank");

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
            <div className="small text-muted">CRUD items, feature toggle, reorder, and upload screenshots.</div>
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
                            {it.is_featured ? <span className="badge text-bg-warning ms-2">Featured</span> : null}
                            {it.is_published ? <span className="badge text-bg-success ms-2">Published</span> : <span className="badge text-bg-secondary ms-2">Hidden</span>}
                          </div>
                          <div className="text-muted small">
                            Order: {it.sort_order} • Media: {list.length}
                          </div>
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
                      <div className="col-12 col-md-4">
                        <label className="form-label">Title</label>
                        <input className="form-control" defaultValue={it.title} onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== it.title) updateItem(it.id, { title: v });
                        }} disabled={busy} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Subtitle</label>
                        <input className="form-control" defaultValue={it.subtitle || ""} onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (it.subtitle || "")) updateItem(it.id, { subtitle: v || null });
                        }} disabled={busy} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Tags</label>
                        <input className="form-control" defaultValue={fromTags(it.tags)} onBlur={(e) => updateItem(it.id, { tags: toTags(e.target.value) })} disabled={busy} />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="3" defaultValue={it.description || ""} onBlur={(e) => updateItem(it.id, { description: e.target.value.trim() || null })} disabled={busy} />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Project URL</label>
                        <input className="form-control" defaultValue={it.project_url || ""} onBlur={(e) => updateItem(it.id, { project_url: e.target.value.trim() || null })} disabled={busy} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Repo URL</label>
                        <input className="form-control" defaultValue={it.repo_url || ""} onBlur={(e) => updateItem(it.id, { repo_url: e.target.value.trim() || null })} disabled={busy} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Results/Metrics</label>
                        <textarea className="form-control" rows="3" defaultValue={fromArr(it.results)} onBlur={(e) => updateItem(it.id, { results: toLines(e.target.value) })} disabled={busy} />
                      </div>

                      <div className="col-6">
                        <div className="form-check mt-2">
                          <input className="form-check-input" type="checkbox" defaultChecked={!!it.is_featured} onChange={(e) => updateItem(it.id, { is_featured: e.target.checked })} disabled={busy} id={`feat_${it.id}`} />
                          <label className="form-check-label" htmlFor={`feat_${it.id}`}>Featured</label>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="form-check mt-2">
                          <input className="form-check-input" type="checkbox" defaultChecked={!!it.is_published} onChange={(e) => updateItem(it.id, { is_published: e.target.checked })} disabled={busy} id={`pub_${it.id}`} />
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
                          Uploads to bucket <code>portfolio-media</code> under <code>portfolio/{it.id}/</code>.
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
                                        <input
                                          className="form-control form-control-sm mb-2"
                                          placeholder="Alt text"
                                          defaultValue={m.alt || ""}
                                          onBlur={(e) => updateMedia(m.id, { alt: e.target.value.trim() || null })}
                                          disabled={busy}
                                        />
                                        <input
                                          className="form-control form-control-sm mb-2"
                                          placeholder="Caption"
                                          defaultValue={m.caption || ""}
                                          onBlur={(e) => updateMedia(m.id, { caption: e.target.value.trim() || null })}
                                          disabled={busy}
                                        />

                                        <div className="d-flex flex-wrap gap-2 align-items-center">
                                          <div className="form-check">
                                            <input
                                              className="form-check-input"
                                              type="checkbox"
                                              defaultChecked={!!m.is_published}
                                              onChange={(e) => updateMedia(m.id, { is_published: e.target.checked })}
                                              disabled={busy}
                                              id={`m_pub_${m.id}`}
                                            />
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

                                        <div className="small text-muted mt-1">
                                          Order: {m.sort_order}
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
      </div>
    </div>
  );
}
