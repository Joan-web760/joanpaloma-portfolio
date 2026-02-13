"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminStepper, { AdminStep } from "@/components/admin/AdminStepper";

export default function AdminResumePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [row, setRow] = useState(null);

  const cvUrl = useMemo(() => {
    if (!row?.cv_file_path) return "";
    // If bucket is public:
    return supabase.storage.from("portfolio-docs").getPublicUrl(row.cv_file_path).data.publicUrl;
  }, [row?.cv_file_path]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/resume");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("section_resume")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load resume section.");
        setLoading(false);
        return;
      }

      setRow(data || null);
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

  const updateRow = async (patch) => {
    if (!row?.id) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("section_resume")
        .update(patch)
        .eq("id", row.id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setRow(data);
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      throw new Error("Please upload a PDF file.");
    }

    const filename = `resume_${crypto.randomUUID()}.pdf`;
    const path = `resume/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("portfolio-docs")
      .upload(path, file, { upsert: false, contentType: "application/pdf" });

    if (upErr) throw upErr;

    return path;
  };

  const replaceCv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const newPath = await uploadPdf(file);

      // Optional: remove old file (if any)
      if (row?.cv_file_path) {
        await supabase.storage.from("portfolio-docs").remove([row.cv_file_path]);
      }

      await updateRow({ cv_file_path: newPath });
      toast("CV uploaded.");
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const openPreview = () => window.open("/#resume", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Resume editor...
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">No row found in section_resume. Re-run the seed SQL.</div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Resume / CV</h1>
            <div className="small text-muted">Upload/replace your CV PDF and edit the summary + button label.</div>
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
          <AdminStep title="Summary and Publish" description="Update summary, label, and visibility.">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Summary</label>
                    <textarea
                      className="form-control"
                      rows="5"
                      defaultValue={row.summary || ""}
                      onBlur={(e) => updateRow({ summary: e.target.value.trim() || null })}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Button Label</label>
                    <input
                      className="form-control"
                      defaultValue={row.button_label || "Download CV"}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || "Download CV";
                        if (v !== row.button_label) updateRow({ button_label: v });
                      }}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12 col-md-6 d-flex align-items-end">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        defaultChecked={!!row.is_published}
                        onChange={(e) => updateRow({ is_published: e.target.checked })}
                        disabled={busy}
                        id="resumePub"
                      />
                      <label className="form-check-label" htmlFor="resumePub">Published</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AdminStep>

          <AdminStep title="CV File" description="Upload and review your PDF.">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Upload / Replace CV (PDF)</label>
                    <input className="form-control" type="file" accept="application/pdf" onChange={replaceCv} disabled={busy} />
                    <div className="form-text">
                      Uploads to bucket <code>portfolio-docs</code> under <code>resume/</code>.
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="border rounded p-3 bg-white">
                      <div className="fw-semibold mb-1">Current CV</div>
                      {row.cv_file_path ? (
                        <>
                          <div className="small text-muted mb-2">
                            Path: <code>{row.cv_file_path}</code>
                          </div>
                          {cvUrl ? (
                            <a className="btn btn-outline-dark" href={cvUrl} target="_blank" rel="noreferrer">
                              <i className="fa-solid fa-file-pdf me-2"></i>Open PDF
                            </a>
                          ) : (
                            <div className="text-muted small">No public URL (bucket might be private).</div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted">No CV uploaded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AdminStep>
        </AdminStepper>

      </div>
    </div>
  );
}
