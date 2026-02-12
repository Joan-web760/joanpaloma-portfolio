"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

/**
 * Updates:
 * - Fix type editing: lock grouping via __group so inputs don't remount while typing
 * - Level UI: replace number input with adjustable progress bar (range slider + % badge)
 */

const TYPE_EXAMPLES = ["Frontend", "Backend", "Database", "DevOps", "Tools", "Soft Skills", "Mobile", "Cloud"];

const normalizeType = (v) => {
  const s = (v || "").trim();
  return s || "General";
};

const titleCaseLike = (v) => {
  const s = (v || "").trim();
  if (!s) return "";
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const sortSkills = (arr) =>
  [...arr].sort((a, b) => {
    const ta = normalizeType(a.type);
    const tb = normalizeType(b.type);
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

const isSameSkill = (a, b) => {
  if (!a || !b) return false;
  return (
    String(a.name || "") === String(b.name || "") &&
    normalizeType(a.type) === normalizeType(b.type) &&
    Number(a.level || 0) === Number(b.level || 0) &&
    !!a.is_published === !!b.is_published
  );
};

export default function AdminSkillsPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // canonical from DB (used for diff)
  const [skills, setSkills] = useState([]);
  // editable local draft (what user sees/edits)
  const [draftSkills, setDraftSkills] = useState([]);

  const initialSkillsRef = useRef([]); // last loaded baseline snapshot (with __group)

  const [newSkill, setNewSkill] = useState({
    name: "",
    type: "",
    level: 80,
    is_published: true,
  });

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  };

  const withGroup = (arr) => arr.map((x) => ({ ...x, __group: normalizeType(x.type) }));

  const loadSkills = async () => {
    const { data, error: dbErr } = await supabase
      .from("skill_items")
      .select("*")
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (dbErr) throw dbErr;

    const sorted = sortSkills(data || []);
    setSkills(sorted);
    setDraftSkills(withGroup(sorted));
    initialSkillsRef.current = withGroup(sorted);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/skills");
        return;
      }

      try {
        await loadSkills();
        if (!alive) return;
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed to load skills.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // derive types from draft so grouping matches what the user typed (even before saving)
  // NOTE: use __group so the item doesn't "jump" sections while typing
  const typeList = useMemo(() => {
    const set = new Set();
    for (const s of draftSkills) set.add(s.__group || normalizeType(s.type));
    if (newSkill.type.trim()) set.add(normalizeType(newSkill.type));
    set.add("General");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [draftSkills, newSkill.type]);

  const grouped = useMemo(() => {
    const map = {};
    for (const t of typeList) map[t] = [];

    for (const s of draftSkills) {
      const t = s.__group || normalizeType(s.type);
      if (!map[t]) map[t] = [];
      map[t].push(s);
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return map;
  }, [draftSkills, typeList]);

  const dirtyCount = useMemo(() => {
    const base = initialSkillsRef.current || [];
    const baseMap = new Map(base.map((s) => [s.id, s]));
    let count = 0;

    for (const d of draftSkills) {
      const b = baseMap.get(d.id);
      if (!b) continue;
      if (!isSameSkill(d, b)) count++;
    }
    return count;
  }, [draftSkills]);

  const setDraftField = (id, patch) => {
    setDraftSkills((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };

        if (Object.prototype.hasOwnProperty.call(patch, "name")) {
          next.name = String(next.name || "");
        }
        if (Object.prototype.hasOwnProperty.call(patch, "level")) {
          const lv = Number(next.level);
          next.level = Number.isNaN(lv) ? s.level : clamp(lv, 0, 100);
        }
        return next;
      })
    );
  };

  const saveChanges = async () => {
    const ok = await confirm({
      title: "Save changes?",
      message: "Apply your staged edits to the skills list.",
      confirmText: "Save",
      confirmVariant: "success",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {

      const base = initialSkillsRef.current || [];
      const baseMap = new Map(base.map((s) => [s.id, s]));

      const updates = [];
      for (const d of draftSkills) {
        const b = baseMap.get(d.id);
        if (!b) continue;

        if (!isSameSkill(d, b)) {
          const name = String(d.name || "").trim();
          const type = titleCaseLike(normalizeType(d.type));
          const level = Number(d.level);

          if (!name) throw new Error("A skill name is empty. Please fill it in before saving.");
          if (!type) throw new Error("A skill type is empty. Please fill it in before saving.");
          if (Number.isNaN(level) || level < 0 || level > 100) throw new Error("Level must be 0–100.");

          updates.push({
            id: d.id,
            name,
            type,
            level,
            is_published: !!d.is_published,
          });
        }
      }

      if (!updates.length) {
        toast("No changes to save.");
        return;
      }

      const { data, error: updErr } = await supabase.from("skill_items").upsert(updates).select("*");
      if (updErr) throw updErr;

      const returnedMap = new Map((data || []).map((x) => [x.id, x]));
      const nextCanonical = sortSkills(
        skills.map((s) => {
          const r = returnedMap.get(s.id);
          return r ? { ...s, ...r } : s;
        })
      );

      setSkills(nextCanonical);
      setDraftSkills(withGroup(nextCanonical));
      initialSkillsRef.current = withGroup(nextCanonical);

      toast(`Saved ${updates.length} change${updates.length > 1 ? "s" : ""}.`);
      success({ title: "Changes saved", message: "Skill updates were applied." });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const discardChanges = () => {
    const base = initialSkillsRef.current || [];
    setDraftSkills(base.map((x) => ({ ...x })));
    toast("Changes discarded.");
  };

  const createSkill = async () => {
    const ok = await confirm({
      title: "Add skill?",
      message: "This will create a new skill item.",
      confirmText: "Add",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const name = newSkill.name.trim();
      if (!name) throw new Error("Skill name is required.");

      const type = titleCaseLike(normalizeType(newSkill.type));
      if (!type) throw new Error("Skill type is required.");

      const level = clamp(Number(newSkill.level), 0, 100);
      if (Number.isNaN(level)) throw new Error("Level must be 0–100.");

      const list = skills.filter((s) => normalizeType(s.type) === normalizeType(type));
      const maxOrder = list.length ? Math.max(...list.map((s) => s.sort_order || 0)) : 0;

      const payload = {
        name,
        type,
        level,
        is_published: !!newSkill.is_published,
        sort_order: maxOrder + 10,
      };

      const { data, error: insErr } = await supabase.from("skill_items").insert([payload]).select("*").single();
      if (insErr) throw insErr;

      const next = sortSkills([...skills, data]);
      setSkills(next);
      setDraftSkills(withGroup(next));
      initialSkillsRef.current = withGroup(next);

      setNewSkill({ name: "", type: type, level: 80, is_published: true });
      toast("Skill created.");
      success({ title: "Skill added", message: "The skill was created successfully." });
    } catch (e) {
      setError(e.message || "Create skill failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkill = async (id) => {
    const ok = await confirm({
      title: "Delete skill?",
      message: "This will permanently remove the skill.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("skill_items").delete().eq("id", id);
      if (delErr) throw delErr;

      const next = skills.filter((s) => s.id !== id);
      setSkills(next);
      setDraftSkills(withGroup(next));
      initialSkillsRef.current = withGroup(next);

      toast("Skill deleted.");
      success({ title: "Skill deleted", message: "The skill was removed." });
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
      .filter((s) => normalizeType(s.type) === normalizeType(current.type))
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = list.findIndex((s) => s.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: e1 } = await supabase.from("skill_items").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("skill_items").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (e2) throw e2;

      const next = sortSkills(
        skills.map((s) => {
          if (s.id === a.id) return { ...s, sort_order: b.sort_order };
          if (s.id === b.id) return { ...s, sort_order: a.sort_order };
          return s;
        })
      );

      setSkills(next);
      setDraftSkills(withGroup(next));
      initialSkillsRef.current = withGroup(next);

      toast("Order updated.");
    } catch (e) {
      setError(e.message || "Reorder failed.");
    } finally {
      setBusy(false);
    }
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
            <div className="small text-muted">CRUD skills by custom type, level, publish, and order.</div>
          </div>

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button className="btn btn-success" onClick={saveChanges} disabled={busy || dirtyCount === 0}>
              <i className="fa-solid fa-floppy-disk me-2"></i>
              {busy ? "Saving..." : `Save${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </button>

            <button className="btn btn-outline-secondary" onClick={discardChanges} disabled={busy || dirtyCount === 0}>
              <i className="fa-solid fa-rotate-left me-2"></i>Discard
            </button>

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
                  placeholder='e.g. "React", "Laravel", "MySQL"'
                  onChange={(e) => setNewSkill((p) => ({ ...p, name: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Type</label>
                <input
                  className="form-control"
                  value={newSkill.type}
                  placeholder='e.g. "Frontend", "Backend", "Database", "DevOps", "Tools"'
                  onChange={(e) => setNewSkill((p) => ({ ...p, type: e.target.value }))}
                  onBlur={(e) => {
                    const v = titleCaseLike(normalizeType(e.target.value));
                    setNewSkill((p) => ({ ...p, type: v === "General" ? "" : v }));
                  }}
                  disabled={busy}
                  list="skillTypeExamples"
                />
                <datalist id="skillTypeExamples">
                  {TYPE_EXAMPLES.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </div>

              {/* NEW: Level slider + progress */}
              <div className="col-12 col-md-3">
                <label className="form-label d-flex align-items-center justify-content-between">
                  <span>Level</span>
                  <span className="badge text-bg-secondary">{clamp(Number(newSkill.level) || 0, 0, 100)}%</span>
                </label>

                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="100"
                  value={clamp(Number(newSkill.level) || 0, 0, 100)}
                  onChange={(e) => setNewSkill((p) => ({ ...p, level: Number(e.target.value) }))}
                  disabled={busy}
                />

                <div className="progress" role="progressbar" aria-valuenow={clamp(Number(newSkill.level) || 0, 0, 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-bar" style={{ width: `${clamp(Number(newSkill.level) || 0, 0, 100)}%` }} />
                </div>
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
                  <label className="form-check-label" htmlFor="newSkillPub">
                    Pub
                  </label>
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

        {/* List by derived type */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Skills Catalog</h2>

            {typeList.map((t) => {
              const list = grouped[t] || [];
              if (!list.length) return null;

              return (
                <div key={t} className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-semibold">{t}</div>
                    <span className="text-muted small">{list.length} items</span>
                  </div>

                  <div className="vstack gap-2">
                    {list.map((s) => {
                      const lvl = clamp(Number(s.level) || 0, 0, 100);

                      return (
                        <div key={s.id} className="border rounded bg-white p-3">
                          <div className="row g-2 align-items-end">
                            <div className="col-12 col-md-4">
                              <label className="form-label">Name</label>
                              <input
                                className="form-control"
                                value={s.name || ""}
                                onChange={(e) => setDraftField(s.id, { name: e.target.value })}
                                disabled={busy}
                              />
                            </div>

                            <div className="col-12 col-md-3">
                              <label className="form-label">Type</label>
                              <input
                                className="form-control"
                                value={s.type || ""}
                                placeholder='e.g. "Frontend", "Backend", "Database", "DevOps"'
                                onChange={(e) => setDraftField(s.id, { type: e.target.value })}
                                onBlur={(e) => {
                                  const formatted = titleCaseLike(normalizeType(e.target.value));
                                  setDraftField(s.id, { type: formatted, __group: normalizeType(formatted) });
                                }}
                                disabled={busy}
                                list="skillTypeExamples"
                              />
                            </div>

                            {/* NEW: Level slider + progress */}
                            <div className="col-12 col-md-2">
                              <label className="form-label d-flex align-items-center justify-content-between">
                                <span>Level</span>
                                <span className="badge text-bg-secondary">{lvl}%</span>
                              </label>

                              <input
                                type="range"
                                className="form-range"
                                min="0"
                                max="100"
                                value={lvl}
                                onChange={(e) => setDraftField(s.id, { level: Number(e.target.value) })}
                                disabled={busy}
                              />

                              <div className="progress" role="progressbar" aria-valuenow={lvl} aria-valuemin={0} aria-valuemax={100}>
                                <div className="progress-bar" style={{ width: `${lvl}%` }} />
                              </div>
                            </div>

                            <div className="col-6 col-md-1">
                              <div className="form-check mt-4">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={!!s.is_published}
                                  onChange={(e) => setDraftField(s.id, { is_published: e.target.checked })}
                                  disabled={busy}
                                  id={`skillPub_${s.id}`}
                                />
                                <label className="form-check-label" htmlFor={`skillPub_${s.id}`}>
                                  Pub
                                </label>
                              </div>
                            </div>

                            <div className="col-6 col-md-2 d-grid">
                              <button
                                className="btn btn-outline-danger mt-md-4"
                                onClick={() => deleteSkill(s.id)}
                                disabled={busy}
                              >
                                <i className="fa-solid fa-trash me-2"></i>Delete
                              </button>
                            </div>

                            <div className="col-12">
                              <div className="d-flex gap-2 mt-2">
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => moveSkill(s.id, "up")}
                                  disabled={busy}
                                >
                                  <i className="fa-solid fa-arrow-up me-2"></i>Move up
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => moveSkill(s.id, "down")}
                                  disabled={busy}
                                >
                                  <i className="fa-solid fa-arrow-down me-2"></i>Move down
                                </button>
                                <span className="ms-auto text-muted small">Order: {s.sort_order}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!draftSkills.length ? <div className="text-muted">No skills yet.</div> : null}
          </div>
        </div>
      </div>
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
