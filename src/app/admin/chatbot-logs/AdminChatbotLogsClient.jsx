"use client";

import React, { useEffect, useState } from "react";
import MarkdownContent from "@/components/MarkdownContent";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

export default function AdminChatbotLogsClient() {
  return <ManageChatbotLogs />;
}

function ManageChatbotLogs() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/chatbot-logs");
        return;
      }

      const { data, error } = await supabase
        .from("chatbot_logs")
        .select("*")
        .order("is_reviewed", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error && data) {
        setRows(data.map((r) => ({ ...r, __open: false })));
      }
      setLoading(false);
    })();
  }, [router]);

  const toggleOpen = (id) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, __open: !r.__open } : r)));
  };

  const markReviewed = async (id, on) => {
    setMsg(null);
    setWorking(true);
    try {
      const payload = {
        is_reviewed: on,
        reviewed_at: on ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("chatbot_logs").update(payload).eq("id", id);
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...payload } : r))
      );
      setMsg({ type: "success", text: on ? "Marked as reviewed." : "Marked as unreviewed." });
    } catch (err) {
      setMsg({ type: "danger", text: err.message || "Failed to update log." });
    } finally {
      setWorking(false);
    }
  };

  const performDelete = async (row) => {
    const ok = await confirm({
      title: "Delete chatbot log?",
      message: `Delete this chatbot log? ${String(row.user_message || "").slice(0, 120) || "(empty)"}`,
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    const id = row.id;
    if (!id) return;
    setMsg(null);
    setWorking(true);
    try {
      const { error } = await supabase.from("chatbot_logs").delete().eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMsg({ type: "success", text: "Chatbot log deleted." });
      success({ title: "Log deleted", message: "The chatbot log was removed." });
    } catch (err) {
      setMsg({ type: "danger", text: err.message || "Failed to delete log." });
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">
          <i className="fa-solid fa-robot me-2"></i>Chatbot Logs
        </h1>
        <button
          className="btn btn-outline-secondary d-none d-lg-inline-flex"
          onClick={() => location.reload()}
          disabled={loading || working}
          title="Reload"
        >
          <i className="fa-solid fa-rotate"></i>
        </button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`} role="alert">{msg.text}</div>}

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border" role="status"></div>
          <p className="mt-3">Loading chatbot logs...</p>
        </div>
      ) : (
        <div className="table-responsive admin-records-table-wrap">
          <table className="table table-bordered align-middle admin-records-table admin-chatbot-logs-table">
            <thead className="table-light">
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th style={{ minWidth: 220 }}>Visitor Question</th>
                <th style={{ minWidth: 150 }}>Page</th>
                <th style={{ minWidth: 110 }}>Model</th>
                <th style={{ minWidth: 120 }}>Status</th>
                <th style={{ minWidth: 180 }}>Created</th>
                <th style={{ minWidth: 120 }}>Reviewed</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted">
                    No chatbot logs yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <React.Fragment key={r.id}>
                    <tr className={!r.is_reviewed ? "table-warning" : ""}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>{r.user_message || "-"}</td>
                      <td>
                        {r.page_url ? (
                          <a href={r.page_url} target="_blank" rel="noreferrer">
                            {r.page_url}
                          </a>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{r.model || "-"}</td>
                      <td>
                        <span className={`badge ${r.status === "error" ? "text-bg-danger" : "text-bg-secondary"}`}>
                          {r.status || "completed"}
                        </span>
                      </td>
                      <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</td>
                      <td>
                        {r.is_reviewed ? (
                          <span className="badge text-bg-success">Reviewed</span>
                        ) : (
                          <span className="badge text-bg-secondary">Pending</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => toggleOpen(r.id)}
                          >
                            <i className="fa-solid fa-eye me-1"></i>
                            {r.__open ? "Hide" : "View"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => markReviewed(r.id, !r.is_reviewed)}
                            disabled={working}
                          >
                            <i className="fa-solid fa-check me-1"></i>
                            {r.is_reviewed ? "Unreview" : "Review"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => performDelete(r)}
                            disabled={working}
                          >
                            <i className="fa-solid fa-trash me-1"></i>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {r.__open && (
                      <tr className="admin-records-table__details">
                        <td colSpan={8}>
                          <div className="p-3 bg-light rounded border">
                            <div className="mb-3">
                              <strong>Visitor Question:</strong>
                              <div style={{ whiteSpace: "pre-wrap" }}>{r.user_message || "-"}</div>
                            </div>
                            <div className="mb-3">
                              <strong>Assistant Response:</strong>
                              <MarkdownContent className="mt-1">
                                {r.assistant_response || "-"}
                              </MarkdownContent>
                            </div>
                            <div className="small text-muted">
                              IP: {r.ip_address || "-"}
                              <br />
                              User Agent: {r.user_agent || "-"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-lg-none mt-3 text-muted small">
        Tip: tables scroll horizontally on mobile. Tap <em>View</em> to expand a chatbot log.
      </div>

      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </>
  );
}
