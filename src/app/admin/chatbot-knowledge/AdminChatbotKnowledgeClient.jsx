"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const EMPTY_ITEM = {
  category: "",
  question: "",
  answer: "",
  keywords: "",
  visibility: "public",
  is_published: true,
  priority: 0,
  notes: "",
};

export default function AdminChatbotKnowledgeClient() {
  return <ManageChatbotKnowledge />;
}

function ManageChatbotKnowledge() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/chatbot-knowledge");
        return;
      }

      const { data, error } = await supabase
        .from("chatbot_knowledge")
        .select("*")
        .order("priority", { ascending: false })
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRows(data.map((row) => ({ ...row, __edit: false, __draft: { ...row } })));
      }
      setLoading(false);
    })();
  }, [router]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((row) =>
      [
        row.category,
        row.question,
        row.answer,
        row.keywords,
        row.visibility,
        row.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, search]);

  const onNewChange = (key) => (e) => {
    const value =
      key === "is_published"
        ? e.target.checked
        : key === "priority"
          ? Number(e.target.value ?? 0)
          : e.target.value;
    setNewItem((prev) => ({ ...prev, [key]: value }));
  };

  const onDraftChange = (id, key) => (e) => {
    const value =
      key === "is_published"
        ? e.target.checked
        : key === "priority"
          ? Number(e.target.value ?? 0)
          : e.target.value;

    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, __draft: { ...row.__draft, [key]: value } } : row
      )
    );
  };

  const validateItem = (item) => {
    if (!String(item.category || "").trim()) return "Category is required.";
    if (!String(item.question || "").trim()) return "Question is required.";
    if (!String(item.answer || "").trim()) return "Answer is required.";
    if (!["public", "private"].includes(String(item.visibility || "").trim())) {
      return "Visibility must be public or private.";
    }
    return "";
  };

  const addKnowledge = async (e) => {
    e?.preventDefault?.();
    setMsg(null);

    const validationError = validateItem(newItem);
    if (validationError) {
      setMsg({ type: "danger", text: validationError });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: newItem.category.trim(),
        question: newItem.question.trim(),
        answer: newItem.answer.trim(),
        keywords: String(newItem.keywords || "").trim() || null,
        visibility: newItem.visibility,
        is_published: Boolean(newItem.is_published),
        priority: Number.isFinite(+newItem.priority) ? +newItem.priority : 0,
        notes: String(newItem.notes || "").trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("chatbot_knowledge")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setRows((prev) => [{ ...data, __edit: false, __draft: { ...data } }, ...prev]);
      setNewItem(EMPTY_ITEM);
      setMsg({ type: "success", text: "Knowledge entry added." });
    } catch (err) {
      setMsg({ type: "danger", text: err.message || "Failed to add knowledge entry." });
    } finally {
      setSaving(false);
    }
  };

  const toggleEdit = (id, on) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, __edit: on, __draft: { ...row } } : row
      )
    );
  };

  const saveRow = async (id) => {
    setMsg(null);
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    const draft = row.__draft || {};
    const validationError = validateItem(draft);
    if (validationError) {
      setMsg({ type: "danger", text: validationError });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: String(draft.category || "").trim(),
        question: String(draft.question || "").trim(),
        answer: String(draft.answer || "").trim(),
        keywords: String(draft.keywords || "").trim() || null,
        visibility: draft.visibility === "private" ? "private" : "public",
        is_published: Boolean(draft.is_published),
        priority: Number.isFinite(+draft.priority) ? +draft.priority : 0,
        notes: String(draft.notes || "").trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("chatbot_knowledge").update(payload).eq("id", id);
      if (error) throw error;

      setRows((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...payload, __edit: false, __draft: { ...item, ...payload } }
            : item
        )
      );
      setMsg({ type: "success", text: "Knowledge entry updated." });
    } catch (err) {
      setMsg({ type: "danger", text: err.message || "Failed to update knowledge entry." });
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id) => {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    const confirmed = window.confirm(
      `Delete this chatbot knowledge entry?\n\n${row.question || "Untitled entry"}`
    );
    if (!confirmed) return;

    setMsg(null);
    setSaving(true);
    try {
      const { error } = await supabase.from("chatbot_knowledge").delete().eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.filter((item) => item.id !== id));
      setMsg({ type: "success", text: "Knowledge entry deleted." });
    } catch (err) {
      setMsg({ type: "danger", text: err.message || "Failed to delete knowledge entry." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">
            <i className="fa-solid fa-brain me-2"></i>Chatbot Knowledge
          </h1>
          <p className="text-muted mb-0">
            Add approved answers, recruiter notes, and common Q&amp;A for the public chatbot.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary d-none d-lg-inline-flex"
          onClick={() => location.reload()}
          disabled={loading || saving}
          title="Reload"
        >
          <i className="fa-solid fa-rotate"></i>
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`} role="alert">{msg.text}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">Add Knowledge Entry</h2>
          <form onSubmit={addKnowledge}>
            <div className="row g-3">
              <div className="col-12 col-lg-3">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-control"
                  value={newItem.category}
                  onChange={onNewChange("category")}
                  placeholder="e.g., hiring, pricing, availability"
                  required
                />
              </div>
              <div className="col-12 col-lg-6">
                <label className="form-label">Question</label>
                <input
                  type="text"
                  className="form-control"
                  value={newItem.question}
                  onChange={onNewChange("question")}
                  placeholder="e.g., Is Joan available for virtual assistant work?"
                  required
                />
              </div>
              <div className="col-6 col-lg-1">
                <label className="form-label">Priority</label>
                <input
                  type="number"
                  className="form-control"
                  value={newItem.priority}
                  onChange={onNewChange("priority")}
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label">Visibility</label>
                <select
                  className="form-select"
                  value={newItem.visibility}
                  onChange={onNewChange("visibility")}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Answer</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newItem.answer}
                  onChange={onNewChange("answer")}
                  placeholder="Write the answer the chatbot should know."
                  required
                />
              </div>
              <div className="col-12 col-lg-6">
                <label className="form-label">Keywords</label>
                <input
                  type="text"
                  className="form-control"
                  value={newItem.keywords}
                  onChange={onNewChange("keywords")}
                  placeholder="virtual assistant, hire, budget, availability"
                />
              </div>
              <div className="col-12 col-lg-6">
                <label className="form-label">Internal Notes</label>
                <input
                  type="text"
                  className="form-control"
                  value={newItem.notes}
                  onChange={onNewChange("notes")}
                  placeholder="Optional admin note"
                />
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input
                    id="knowledge-published"
                    type="checkbox"
                    className="form-check-input"
                    checked={newItem.is_published}
                    onChange={onNewChange("is_published")}
                  />
                  <label className="form-check-label" htmlFor="knowledge-published">
                    Published and available to the public chatbot
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <i className="fa-solid fa-plus me-2"></i>Add Entry
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={saving}
                onClick={() => setNewItem(EMPTY_ITEM)}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 className="h6 mb-0">Knowledge Library</h2>
            <input
              type="search"
              className="form-control"
              style={{ maxWidth: 360 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question, answer, keyword..."
            />
          </div>

          {loading ? (
            <div className="text-center my-5">
              <div className="spinner-border" role="status"></div>
              <p className="mt-3 mb-0">Loading chatbot knowledge...</p>
            </div>
          ) : (
            <div className="table-responsive admin-records-table-wrap">
              <table className="table table-bordered align-middle admin-records-table admin-chatbot-knowledge-table">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 52 }}>#</th>
                    <th style={{ minWidth: 140 }}>Category</th>
                    <th style={{ minWidth: 240 }}>Question</th>
                    <th style={{ minWidth: 280 }}>Answer</th>
                    <th style={{ minWidth: 180 }}>Keywords</th>
                    <th style={{ minWidth: 140 }}>Status</th>
                    <th style={{ minWidth: 120 }}>Priority</th>
                    <th style={{ minWidth: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted">
                        No chatbot knowledge entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const draft = row.__draft || row;
                      return (
                        <tr key={row.id}>
                          <td className="text-muted">{idx + 1}</td>
                          <td>
                            {row.__edit ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={draft.category || ""}
                                onChange={onDraftChange(row.id, "category")}
                              />
                            ) : (
                              row.category || "-"
                            )}
                          </td>
                          <td>
                            {row.__edit ? (
                              <textarea
                                className="form-control form-control-sm"
                                rows={3}
                                value={draft.question || ""}
                                onChange={onDraftChange(row.id, "question")}
                              />
                            ) : (
                              row.question || "-"
                            )}
                          </td>
                          <td>
                            {row.__edit ? (
                              <textarea
                                className="form-control form-control-sm"
                                rows={4}
                                value={draft.answer || ""}
                                onChange={onDraftChange(row.id, "answer")}
                              />
                            ) : (
                              <div style={{ whiteSpace: "pre-wrap" }}>{row.answer || "-"}</div>
                            )}
                          </td>
                          <td>
                            {row.__edit ? (
                              <>
                                <input
                                  type="text"
                                  className="form-control form-control-sm mb-2"
                                  value={draft.keywords || ""}
                                  onChange={onDraftChange(row.id, "keywords")}
                                />
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={draft.notes || ""}
                                  onChange={onDraftChange(row.id, "notes")}
                                  placeholder="Internal notes"
                                />
                              </>
                            ) : (
                              <>
                                <div>{row.keywords || "-"}</div>
                                {row.notes ? (
                                  <div className="small text-muted mt-1">Note: {row.notes}</div>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td>
                            {row.__edit ? (
                              <>
                                <select
                                  className="form-select form-select-sm mb-2"
                                  value={draft.visibility || "public"}
                                  onChange={onDraftChange(row.id, "visibility")}
                                >
                                  <option value="public">Public</option>
                                  <option value="private">Private</option>
                                </select>
                                <div className="form-check">
                                  <input
                                    id={`published-${row.id}`}
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={Boolean(draft.is_published)}
                                    onChange={onDraftChange(row.id, "is_published")}
                                  />
                                  <label
                                    className="form-check-label small"
                                    htmlFor={`published-${row.id}`}
                                  >
                                    Published
                                  </label>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span
                                    className={`badge ${
                                      row.visibility === "private"
                                        ? "text-bg-dark"
                                        : "text-bg-primary"
                                    }`}
                                  >
                                    {row.visibility || "public"}
                                  </span>
                                </div>
                                <div className="mt-2">
                                  <span
                                    className={`badge ${
                                      row.is_published ? "text-bg-success" : "text-bg-secondary"
                                    }`}
                                  >
                                    {row.is_published ? "Published" : "Draft"}
                                  </span>
                                </div>
                              </>
                            )}
                          </td>
                          <td>
                            {row.__edit ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={draft.priority ?? 0}
                                onChange={onDraftChange(row.id, "priority")}
                              />
                            ) : (
                              row.priority ?? 0
                            )}
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              {row.__edit ? (
                                <>
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => saveRow(row.id)}
                                    disabled={saving}
                                  >
                                    <i className="fa-solid fa-floppy-disk me-1"></i>Save
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => toggleEdit(row.id, false)}
                                    disabled={saving}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => toggleEdit(row.id, true)}
                                    disabled={saving}
                                  >
                                    <i className="fa-solid fa-pen-to-square me-1"></i>Edit
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => deleteRow(row.id)}
                                    disabled={saving}
                                  >
                                    <i className="fa-solid fa-trash me-1"></i>Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
