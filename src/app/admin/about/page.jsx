"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const DEFAULT_VALUES = ["Clear communication", "Reliable delivery", "Ownership mindset"];
const MEDIA_BUCKET = "portfolio-media";

function safeExt(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext.replace(/[^a-z0-9]/g, "");
}

export default function AdminAboutEditorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [row, setRow] = useState(null);

  const [shortBio, setShortBio] = useState("");
  const [longBio, setLongBio] = useState("");
  const [valuesText, setValuesText] = useState("");

  const [extendedVideoUrl, setExtendedVideoUrl] = useState("");

  // NEW: uploaded video path
  const [extendedVideoPath, setExtendedVideoPath] = useState(null);

  const [aboutImagePath, setAboutImagePath] = useState(null);
  const [isPublished, setIsPublished] = useState(false);

  const aboutImageUrl = useMemo(() => {
    if (!aboutImagePath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(aboutImagePath).data.publicUrl;
  }, [aboutImagePath]);

  // NEW: video preview URL
  const extendedVideoFileUrl = useMemo(() => {
    if (!extendedVideoPath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(extendedVideoPath).data.publicUrl;
  }, [extendedVideoPath]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setNotice("");

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/about");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("section_about")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load About section.");
        setLoading(false);
        return;
      }

      let r = data;
      if (!r) {
        const { data: inserted, error: insErr } = await supabase
          .from("section_about")
          .insert([{ id: 1, values_json: DEFAULT_VALUES, is_published: false }])
          .select("*")
          .single();

        if (insErr) {
          setError(insErr.message || "Failed to initialize About row.");
          setLoading(false);
          return;
        }
        r = inserted;
      }

      setRow(r);

      setShortBio(r.short_bio || "");
      setLongBio(r.long_bio || "");

      const valuesArr = Array.isArray(r.values_json) ? r.values_json : [];
      const normalized = valuesArr
        .map((v) => (typeof v === "string" ? v : v?.text))
        .filter(Boolean);
      setValuesText(normalized.join("\n"));

      setExtendedVideoUrl(r.extended_video_url || "");

      // NEW: load uploaded video path
      setExtendedVideoPath(r.extended_video_path || null);

      setAboutImagePath(r.about_image_path || null);
      setIsPublished(!!r.is_published);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const parseValues = () => {
    return (valuesText || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const uploadImage = async (file) => {
    if (!file) return null;

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safe = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";

    const filename = `${crypto.randomUUID()}.${safe}`;
    const path = `about/image/${filename}`;

    const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
    if (upErr) throw upErr;

    return path;
  };

  // NEW: upload video
  const uploadVideo = async (file) => {
    if (!file) return null;

    if (!file.type?.startsWith("video/")) {
      throw new Error("Please select a valid video file.");
    }

    // optional size limit
    const maxMB = 50;
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`Video too large. Max ${maxMB}MB.`);
    }

    const ext = safeExt(file.name) || "mp4";
    const vidExt = ["mp4", "webm", "mov", "m4v"].includes(ext) ? ext : "mp4";

    const filename = `${crypto.randomUUID()}.${vidExt}`;
    const path = `about/video/${filename}`;

    const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || "video/mp4",
      cacheControl: "3600",
    });

    if (upErr) throw upErr;

    return path;
  };

  const handleSave = async (publishAfterSave = false) => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        short_bio: shortBio || "",
        long_bio: longBio || "",
        values_json: parseValues(),
        extended_video_url: extendedVideoUrl || null,

        // NEW: persist uploaded video path
        extended_video_path: extendedVideoPath || null,

        about_image_path: aboutImagePath,
        is_published: publishAfterSave ? true : isPublished,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updErr } = await supabase
        .from("section_about")
        .update(payload)
        .eq("id", 1)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setRow(data);
      setIsPublished(!!data.is_published);
      setNotice(publishAfterSave ? "Saved and published." : "Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const next = !isPublished;

      const { data, error: updErr } = await supabase
        .from("section_about")
        .update({ is_published: next, updated_at: new Date().toISOString() })
        .eq("id", 1)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setRow(data);
      setIsPublished(next);
      setNotice(next ? "Published." : "Unpublished.");
    } catch (e) {
      setError(e.message || "Publish toggle failed.");
    } finally {
      setSaving(false);
    }
  };

  const onAboutImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadImage(file);
      setAboutImagePath(path);
      setNotice("About image uploaded. Click Save to persist.");
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  // NEW: about video file handler
  const onAboutVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadVideo(file);
      setExtendedVideoPath(path);
      setNotice("About video uploaded. Click Save to persist.");
    } catch (err) {
      setError(err.message || "Video upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const openPreview = () => window.open("/about#about", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading About editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">About — Personal Background</h1>
            <div className="small text-muted">
              Last updated: <strong>{row?.updated_at ? new Date(row.updated_at).toLocaleString() : "—"}</strong>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreview}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>

            <button className="btn btn-outline-secondary" onClick={handleTogglePublish} disabled={saving}>
              {isPublished ? (
                <>
                  <i className="fa-solid fa-toggle-on me-2"></i>Unpublish
                </>
              ) : (
                <>
                  <i className="fa-solid fa-toggle-off me-2"></i>Publish
                </>
              )}
            </button>

            <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-2"></i>Save
                </>
              )}
            </button>

            <button className="btn btn-success" onClick={() => handleSave(true)} disabled={saving}>
              <i className="fa-solid fa-bullhorn me-2"></i>Save & Publish
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

        <div className="row g-3">
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3">Content</h2>

                <div className="mb-3">
                  <label className="form-label">Short Bio</label>
                  <textarea className="form-control" rows="3" value={shortBio} onChange={(e) => setShortBio(e.target.value)} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Long Bio</label>
                  <textarea className="form-control" rows="8" value={longBio} onChange={(e) => setLongBio(e.target.value)} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Values (one per line)</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    placeholder={"Clear communication\nReliable delivery\nOwnership mindset"}
                    value={valuesText}
                    onChange={(e) => setValuesText(e.target.value)}
                  />
                  <div className="form-text">
                    Stored in <code>values_json</code> as an array.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Extended Video URL (optional)</label>
                  <input
                    className="form-control"
                    placeholder="https://youtube.com/..."
                    value={extendedVideoUrl}
                    onChange={(e) => setExtendedVideoUrl(e.target.value)}
                  />
                  <div className="form-text">
                    If you upload a video file, the uploaded video will be used first (extended_video_path).
                  </div>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    id="aboutPublishedCheck"
                  />
                  <label className="form-check-label" htmlFor="aboutPublishedCheck">
                    Mark as published (Save required)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">

            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-2">Quick Links</h2>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary" onClick={() => router.push("/admin")}>
                    <i className="fa-solid fa-arrow-left me-2"></i>Back to Dashboard
                  </button>
                  <button className="btn btn-outline-dark" onClick={openPreview}>
                    <i className="fa-solid fa-eye me-2"></i>Preview /about
                  </button>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">Media</h2>

                <div className="mb-3">
                  <label className="form-label">About Image</label>
                  <input className="form-control" type="file" accept="image/*" onChange={onAboutImageFile} disabled={saving} />

                  {aboutImageUrl ? (
                    <div className="mt-2">
                      <img src={aboutImageUrl} alt="About" className="img-fluid rounded border" />
                      <div className="small text-muted mt-1">
                        Path: <code>{aboutImagePath}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">No about image uploaded.</div>
                  )}
                </div>

                <hr />

                {/* NEW: About Video Upload */}
                <div>
                  <label className="form-label">Extended Video (Upload)</label>
                  <input
                    className="form-control"
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    onChange={onAboutVideoFile}
                    disabled={saving}
                  />

                  {extendedVideoFileUrl ? (
                    <div className="mt-2">
                      <div className="ratio ratio-16x9">
                        <video src={extendedVideoFileUrl} controls playsInline preload="metadata" />
                      </div>
                      <div className="small text-muted mt-2">
                        Path: <code>{extendedVideoPath}</code>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger mt-2"
                        disabled={saving}
                        onClick={() => {
                          setExtendedVideoPath(null);
                          setNotice("Extended video cleared. Click Save to persist.");
                        }}
                      >
                        <i className="fa-solid fa-trash me-2"></i>Remove Video (clears DB field)
                      </button>
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">No extended video uploaded.</div>
                  )}

                  <div className="form-text mt-2">Max 50MB (adjust in code). Recommended: mp4 (H.264).</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="small text-muted mt-3">
          Storage bucket: <code>{MEDIA_BUCKET}</code> — about videos are uploaded to <code>about/video/</code>.
        </div>
      </div>
    </div>
  );
}
