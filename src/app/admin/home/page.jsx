"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const DEFAULT_BADGES = ["Next.js", "Supabase", "Bootstrap", "React"];
const MEDIA_BUCKET = "portfolio-media";

// simple safe filename
function safeExt(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext.replace(/[^a-z0-9]/g, "");
}

export default function AdminHomeEditorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [row, setRow] = useState(null);

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState("");
  const [primaryCtaUrl, setPrimaryCtaUrl] = useState("");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState("");
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState("");

  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [badgesText, setBadgesText] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const [heroImagePath, setHeroImagePath] = useState(null);
  const [profileImagePath, setProfileImagePath] = useState(null);

  // NEW: uploaded video path
  const [introVideoPath, setIntroVideoPath] = useState(null);

  const heroUrl = useMemo(() => {
    if (!heroImagePath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(heroImagePath).data.publicUrl;
  }, [heroImagePath]);

  const profileUrl = useMemo(() => {
    if (!profileImagePath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(profileImagePath).data.publicUrl;
  }, [profileImagePath]);

  // NEW: video preview
  const introVideoFileUrl = useMemo(() => {
    if (!introVideoPath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(introVideoPath).data.publicUrl;
  }, [introVideoPath]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      setNotice("");

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/home");
        return;
      }

      // Load singleton row
      const { data, error: dbErr } = await supabase.from("section_home").select("*").eq("id", 1).maybeSingle();

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load Home section.");
        setLoading(false);
        return;
      }

      // If row missing, create it
      let r = data;
      if (!r) {
        const { data: inserted, error: insErr } = await supabase
          .from("section_home")
          .insert([{ id: 1, badges: DEFAULT_BADGES, is_published: false }])
          .select("*")
          .single();

        if (insErr) {
          setError(insErr.message || "Failed to initialize Home row.");
          setLoading(false);
          return;
        }
        r = inserted;
      }

      setRow(r);

      setHeadline(r.headline || "");
      setSubheadline(r.subheadline || "");
      setPrimaryCtaLabel(r.primary_cta_label || "");
      setPrimaryCtaUrl(r.primary_cta_url || "");
      setSecondaryCtaLabel(r.secondary_cta_label || "");
      setSecondaryCtaUrl(r.secondary_cta_url || "");
      setIntroVideoUrl(r.intro_video_url || "");

      const badgeArr = Array.isArray(r.badges) ? r.badges : [];
      setBadgesText(badgeArr.join(", ") || "");

      setHeroImagePath(r.hero_image_path || null);
      setProfileImagePath(r.profile_image_path || null);

      // NEW: load stored video path
      setIntroVideoPath(r.intro_video_path || null);

      setIsPublished(!!r.is_published);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const parseBadges = () => {
    return (badgesText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const uploadImage = async (file, folder) => {
    if (!file) return null;

    const ext = safeExt(file.name) || "png";
    const imgExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";

    const filename = `${crypto.randomUUID()}.${imgExt}`;
    const path = `home/${folder}/${filename}`;

    const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
    if (upErr) throw upErr;

    return path;
  };

  // NEW: upload video
  const uploadVideo = async (file) => {
    if (!file) return null;

    // basic validation
    if (!file.type?.startsWith("video/")) {
      throw new Error("Please select a valid video file.");
    }

    // optional size limit (change if you want)
    const maxMB = 50;
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`Video too large. Max ${maxMB}MB.`);
    }

    const ext = safeExt(file.name) || "mp4";
    const vidExt = ["mp4", "webm", "mov", "m4v"].includes(ext) ? ext : "mp4";

    const filename = `${crypto.randomUUID()}.${vidExt}`;
    const path = `home/intro/${filename}`;

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
        headline: headline || "",
        subheadline: subheadline || "",
        primary_cta_label: primaryCtaLabel || "",
        primary_cta_url: primaryCtaUrl || "",
        secondary_cta_label: secondaryCtaLabel || "",
        secondary_cta_url: secondaryCtaUrl || "",
        intro_video_url: introVideoUrl || null,

        // NEW: persist uploaded video path
        intro_video_path: introVideoPath || null,

        badges: parseBadges(),
        hero_image_path: heroImagePath,
        profile_image_path: profileImagePath,
        is_published: publishAfterSave ? true : isPublished,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updErr } = await supabase
        .from("section_home")
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
        .from("section_home")
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

  const onHeroFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadImage(file, "hero");
      setHeroImagePath(path);
      setNotice("Hero image uploaded. Click Save to persist.");
    } catch (err) {
      setError(err.message || "Hero upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const onProfileFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadImage(file, "profile");
      setProfileImagePath(path);
      setNotice("Profile image uploaded. Click Save to persist.");
    } catch (err) {
      setError(err.message || "Profile upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  // NEW: video file handler
  const onIntroVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadVideo(file);
      setIntroVideoPath(path);
      setNotice("Intro video uploaded. Click Save to persist.");
    } catch (err) {
      setError(err.message || "Video upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const openPreview = () => window.open("/#home", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Home editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Home — Hero & Intro</h1>
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
                  <label className="form-label">Headline</label>
                  <input className="form-control" value={headline} onChange={(e) => setHeadline(e.target.value)} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Subheadline</label>
                  <textarea className="form-control" rows="3" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
                </div>

                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Primary CTA Label</label>
                    <input className="form-control" value={primaryCtaLabel} onChange={(e) => setPrimaryCtaLabel(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Primary CTA URL</label>
                    <input className="form-control" value={primaryCtaUrl} onChange={(e) => setPrimaryCtaUrl(e.target.value)} />
                  </div>
                </div>

                <div className="row g-2 mt-1">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Secondary CTA Label</label>
                    <input className="form-control" value={secondaryCtaLabel} onChange={(e) => setSecondaryCtaLabel(e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Secondary CTA URL</label>
                    <input className="form-control" value={secondaryCtaUrl} onChange={(e) => setSecondaryCtaUrl(e.target.value)} />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="form-label">Badges (comma-separated)</label>
                  <input
                    className="form-control"
                    placeholder="Next.js, Supabase, Bootstrap..."
                    value={badgesText}
                    onChange={(e) => setBadgesText(e.target.value)}
                  />
                </div>

                <div className="mt-3">
                  <label className="form-label">Intro Video URL (optional)</label>
                  <input
                    className="form-control"
                    placeholder="https://youtube.com/..."
                    value={introVideoUrl}
                    onChange={(e) => setIntroVideoUrl(e.target.value)}
                  />
                  <div className="form-text">
                    If you upload a video file, the uploaded video will be used first (intro_video_path).
                  </div>
                </div>

                <div className="mt-3 form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    id="publishedCheck"
                  />
                  <label className="form-check-label" htmlFor="publishedCheck">
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
                    <i className="fa-solid fa-eye me-2"></i>Preview #home
                  </button>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 mb-3">Media</h2>

                <div className="mb-3">
                  <label className="form-label">Hero Image</label>
                  <input className="form-control" type="file" accept="image/*" onChange={onHeroFile} disabled={saving} />
                  {heroUrl ? (
                    <div className="mt-2">
                      <img src={heroUrl} alt="Hero" className="img-fluid rounded border" />
                      <div className="small text-muted mt-1">
                        Path: <code>{heroImagePath}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">No hero image uploaded.</div>
                  )}
                </div>

                <hr />

                <div className="mb-3">
                  <label className="form-label">Profile Image</label>
                  <input className="form-control" type="file" accept="image/*" onChange={onProfileFile} disabled={saving} />
                  {profileUrl ? (
                    <div className="mt-2">
                      <img src={profileUrl} alt="Profile" className="img-fluid rounded border" />
                      <div className="small text-muted mt-1">
                        Path: <code>{profileImagePath}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">No profile image uploaded.</div>
                  )}
                </div>

                <hr />

                {/* NEW: Intro Video Upload */}
                <div>
                  <label className="form-label">Intro Video (Upload)</label>
                  <input
                    className="form-control"
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    onChange={onIntroVideoFile}
                    disabled={saving}
                  />

                  {introVideoFileUrl ? (
                    <div className="mt-2">
                      <div className="ratio ratio-16x9">
                        <video src={introVideoFileUrl} controls playsInline preload="metadata" />
                      </div>
                      <div className="small text-muted mt-2">
                        Path: <code>{introVideoPath}</code>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger mt-2"
                        disabled={saving}
                        onClick={() => {
                          setIntroVideoPath(null);
                          setNotice("Intro video cleared. Click Save to persist.");
                        }}
                      >
                        <i className="fa-solid fa-trash me-2"></i>Remove Video (clears DB field)
                      </button>
                    </div>
                  ) : (
                    <div className="small text-muted mt-2">No intro video uploaded.</div>
                  )}

                  <div className="form-text mt-2">Max 50MB (adjust in code). Recommended: mp4 (H.264).</div>
                </div>
              </div>
            </div>


          </div>
        </div>

        <div className="small text-muted mt-3">
          Storage bucket: <code>{MEDIA_BUCKET}</code> — intro videos are uploaded to <code>home/intro/</code>.
        </div>
      </div>
    </div>
  );
}
