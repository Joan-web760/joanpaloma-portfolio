"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const SKILL_TYPES = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "database", label: "Database" },
  { value: "tools", label: "Tools" },
  { value: "soft", label: "Soft Skills" },
  { value: "general", label: "General" },
];

export default function AdminSkillsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [skills, setSkills] = useState([]);

  const [newSkill, setNewSkill] = useState({
    name: "",
    type: "frontend",
    level: 80,
    is_published: true,
  });

  const grouped = useMemo(() => {
    const map = {};
    for (const t of SKILL_TYPES) map[t.value] = [];
    for (const s of skills) {
      if (!map[s.type]) map[s.type] = [];
      map[s.type].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [skills]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/skills");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("skill_items")
        .select("*")
        .order("type", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load skills.");
        setLoading(false);
        return;
      }

      setSkills(data || []);
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

  const createSkill = async () => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (!newSkill.name.trim()) throw new Error("Skill name is required.");
      if (newSkill.level < 0 || newSkill.level > 100) throw new Error("Level must be 0–100.");

      const list = skills.filter((s) => s.type === newSkill.type);
      const maxOrder = list.length ? Math.max(...list.map((s) => s.sort_order || 0)) : 0;

      const payload = {
        name: newSkill.name.trim(),
        type: newSkill.type,
        level: Number(newSkill.level),
        is_published: !!newSkill.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase
        .from("skill_items")
        .insert([payload])
        .select("*")
        .single();

      if (insErr) throw insErr;

      setSkills((prev) =>
        [...prev, data].sort((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type);
          return (a.sort_order || 0) - (b.sort_order || 0);
        })
      );

      setNewSkill({ name: "", type: newSkill.type, level: 80, is_published: true });
      toast("Skill created.");
    } catch (e) {
      setError(e.message || "Create skill failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateSkill = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("skill_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setSkills((prev) =>
        prev
          .map((s) => (s.id === id ? data : s))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return (a.sort_order || 0) - (b.sort_order || 0);
          })
      );

      toast("Skill updated.");
    } catch (e) {
      setError(e.message || "Update skill failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkill = async (id) => {
    if (!confirm("Delete this skill?")) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("skill_items").delete().eq("id", id);
      if (delErr) throw delErr;

      setSkills((prev) => prev.filter((s) => s.id !== id));
      toast("Skill deleted.");
    } catch (e) {
      setError(e.message || "Delete skill failed.");
    } finally {
      setBusy(false);
    }
  };

  const moveSkill = async (id, dir) => {
    const current = skills.find((s) => s.id === id);
    if (!current) return;

    const list = skills
      .filter((s) => s.type === current.type)
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = list.findIndex((s) => s.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    await Promise.all([
      updateSkill(a.id, { sort_order: b.sort_order }),
      updateSkill(b.id, { sort_order: a.sort_order }),
    ]);
  };

  const openPreview = () => window.open("/#skills", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Skills editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Skills</h1>
            <div className="small text-muted">CRUD skills by type, level, publish, and order.</div>
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

        {/* Add Skill */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Add Skill</h2>

            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill((p) => ({ ...p, name: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={newSkill.type}
                  onChange={(e) => setNewSkill((p) => ({ ...p, type: e.target.value }))}
                  disabled={busy}
                >
                  {SKILL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Level (%)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max="100"
                  value={newSkill.level}
                  onChange={(e) => setNewSkill((p) => ({ ...p, level: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-6 col-md-1">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!newSkill.is_published}
                    onChange={(e) => setNewSkill((p) => ({ ...p, is_published: e.target.checked }))}
                    disabled={busy}
                    id="newSkillPub"
                  />
                  <label className="form-check-label" htmlFor="newSkillPub">Pub</label>
                </div>
              </div>

              <div className="col-6 col-md-1 d-grid">
                <button className="btn btn-primary" onClick={createSkill} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List by type */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Skills Catalog</h2>

            {SKILL_TYPES.map((t) => {
              const list = grouped[t.value] || [];
              if (!list.length) return null;

              return (
                <div key={t.value} className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-semibold">{t.label}</div>
                    <span className="text-muted small">{list.length} items</span>
                  </div>

                  <div className="vstack gap-2">
                    {list.map((s) => (
                      <div key={s.id} className="border rounded bg-white p-3">
                        <div className="row g-2 align-items-end">
                          <div className="col-12 col-md-4">
                            <label className="form-label">Name</label>
                            <input
                              className="form-control"
                              defaultValue={s.name}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v && v !== s.name) updateSkill(s.id, { name: v });
                              }}
                              disabled={busy}
                            />
                          </div>

                          <div className="col-12 col-md-3">
                            <label className="form-label">Type</label>
                            <select
                              className="form-select"
                              defaultValue={s.type}
                              onChange={(e) => updateSkill(s.id, { type: e.target.value })}
                              disabled={busy}
                            >
                              {SKILL_TYPES.map((x) => (
                                <option key={x.value} value={x.value}>{x.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-12 col-md-2">
                            <label className="form-label">Level</label>
                            <input
                              className="form-control"
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={s.level}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v) && v !== s.level) updateSkill(s.id, { level: v });
                              }}
                              disabled={busy}
                            />
                          </div>

                          <div className="col-6 col-md-1">
                            <div className="form-check mt-4">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                defaultChecked={!!s.is_published}
                                onChange={(e) => updateSkill(s.id, { is_published: e.target.checked })}
                                disabled={busy}
                                id={`skillPub_${s.id}`}
                              />
                              <label className="form-check-label" htmlFor={`skillPub_${s.id}`}>Pub</label>
                            </div>
                          </div>

                          <div className="col-6 col-md-2 d-grid">
                            <button className="btn btn-outline-danger mt-md-4" onClick={() => deleteSkill(s.id)} disabled={busy}>
                              <i className="fa-solid fa-trash me-2"></i>Delete
                            </button>
                          </div>

                          <div className="col-12">
                            <div className="d-flex gap-2 mt-2">
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => moveSkill(s.id, "up")} disabled={busy}>
                                <i className="fa-solid fa-arrow-up me-2"></i>Move up
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => moveSkill(s.id, "down")} disabled={busy}>
                                <i className="fa-solid fa-arrow-down me-2"></i>Move down
                              </button>
                              <span className="ms-auto text-muted small">Order: {s.sort_order}</span>
                            </div>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {!skills.length ? <div className="text-muted">No skills yet.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
