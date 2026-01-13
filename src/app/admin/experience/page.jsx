"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

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
      setForm({ ...emptyForm, is_published: true });
      toast("Experience added.");
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
        .from("experience_items")
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
    if (!confirm("Delete this experience item?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("experience_items").delete().eq("id", id);
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

  const openPreview = () => window.open("/#experience", "_blank");

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
            <div className="small text-muted">Timeline entries with responsibilities, achievements, tools, tags, and order.</div>
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
            <h2 className="h6 mb-3">Add Experience</h2>

            <div className="row g-2">
              <div className="col-12 col-md-4">
                <label className="form-label">Role Title *</label>
                <input className="form-control" value={form.role_title} onChange={(e) => setForm((p) => ({ ...p, role_title: e.target.value }))} disabled={busy} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Company</label>
                <input className="form-control" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} disabled={busy} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Client (optional)</label>
                <input className="form-control" value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Location</label>
                <input className="form-control" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">Start Date</label>
                <input className="form-control" type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">End Date</label>
                <input className="form-control" type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} disabled={busy || form.is_current} />
              </div>

              <div className="col-12 col-md-2">
                <div className="form-check mt-4">
                  <input className="form-check-input" type="checkbox" checked={form.is_current} onChange={(e) => setForm((p) => ({ ...p, is_current: e.target.checked }))} disabled={busy} id="isCurrent" />
                  <label className="form-check-label" htmlFor="isCurrent">Current</label>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Summary</label>
                <textarea className="form-control" rows="2" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Responsibilities (one per line)</label>
                <textarea className="form-control" rows="5" value={form.responsibilitiesText} onChange={(e) => setForm((p) => ({ ...p, responsibilitiesText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Achievements (one per line)</label>
                <textarea className="form-control" rows="5" value={form.achievementsText} onChange={(e) => setForm((p) => ({ ...p, achievementsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tools (comma-separated)</label>
                <input className="form-control" value={form.toolsText} onChange={(e) => setForm((p) => ({ ...p, toolsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-control" value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} disabled={busy} />
              </div>

              <div className="col-6">
                <div className="form-check mt-3">
                  <input className="form-check-input" type="checkbox" checked={!!form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} disabled={busy} id="newExpPub" />
                  <label className="form-check-label" htmlFor="newExpPub">Published</label>
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
              {items.map((it) => (
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

                  <div className="row g-2 mt-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Role</label>
                      <input
                        className="form-control"
                        defaultValue={it.role_title}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== it.role_title) updateItem(it.id, { role_title: v });
                        }}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Company</label>
                      <input
                        className="form-control"
                        defaultValue={it.company || ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (it.company || "")) updateItem(it.id, { company: v || null });
                        }}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Client</label>
                      <input
                        className="form-control"
                        defaultValue={it.client || ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (it.client || "")) updateItem(it.id, { client: v || null });
                        }}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">Location</label>
                      <input
                        className="form-control"
                        defaultValue={it.location || ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (it.location || "")) updateItem(it.id, { location: v || null });
                        }}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label">Start Date</label>
                      <input
                        className="form-control"
                        type="date"
                        defaultValue={it.start_date || ""}
                        onBlur={(e) => updateItem(it.id, { start_date: e.target.value || null })}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label">End Date</label>
                      <input
                        className="form-control"
                        type="date"
                        defaultValue={it.end_date || ""}
                        onBlur={(e) => updateItem(it.id, { end_date: e.target.value || null })}
                        disabled={busy || it.is_current}
                      />
                    </div>

                    <div className="col-12 col-md-2">
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          defaultChecked={!!it.is_current}
                          onChange={(e) =>
                            updateItem(it.id, {
                              is_current: e.target.checked,
                              end_date: e.target.checked ? null : it.end_date,
                            })
                          }
                          disabled={busy}
                          id={`cur_${it.id}`}
                        />
                        <label className="form-check-label" htmlFor={`cur_${it.id}`}>Current</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Summary</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        defaultValue={it.summary || ""}
                        onBlur={(e) => updateItem(it.id, { summary: e.target.value.trim() || null })}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Responsibilities (one per line)</label>
                      <textarea
                        className="form-control"
                        rows="5"
                        defaultValue={fromArray(it.responsibilities)}
                        onBlur={(e) => updateItem(it.id, { responsibilities: toLines(e.target.value) })}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Achievements (one per line)</label>
                      <textarea
                        className="form-control"
                        rows="5"
                        defaultValue={fromArray(it.achievements)}
                        onBlur={(e) => updateItem(it.id, { achievements: toLines(e.target.value) })}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Tools (comma-separated)</label>
                      <input
                        className="form-control"
                        defaultValue={fromTags(it.tools)}
                        onBlur={(e) => updateItem(it.id, { tools: toTags(e.target.value) })}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Tags (comma-separated)</label>
                      <input
                        className="form-control"
                        defaultValue={fromTags(it.tags)}
                        onBlur={(e) => updateItem(it.id, { tags: toTags(e.target.value) })}
                        disabled={busy}
                      />
                    </div>

                    <div className="col-12">
                      <div className="d-flex flex-wrap gap-2 align-items-center">
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

                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveItem(it.id, "up")} disabled={busy}>
                          <i className="fa-solid fa-arrow-up me-2"></i>Move up
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => moveItem(it.id, "down")} disabled={busy}>
                          <i className="fa-solid fa-arrow-down me-2"></i>Move down
                        </button>

                        <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => deleteItem(it.id)} disabled={busy}>
                          <i className="fa-solid fa-trash me-2"></i>Delete
                        </button>
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
