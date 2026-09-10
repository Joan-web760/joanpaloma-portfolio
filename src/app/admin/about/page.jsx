"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminSection from "@/components/admin/AdminSection";
import AdminVisibilityToggle from "@/components/admin/AdminVisibilityToggle";

const DEFAULT_VALUES = ["Clear communication", "Reliable delivery", "Ownership mindset"];
const MEDIA_BUCKET = "portfolio-media";

function safeExt(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext.replace(/[^a-z0-9]/g, "");
}

function snapshotOf(v) {
  return JSON.stringify({
    shortBio: v.shortBio || "",
    longBio: v.longBio || "",
    valuesText: v.valuesText || "",
    extendedVideoUrl: v.extendedVideoUrl || "",
    isPublished: !!v.isPublished,
    aboutImagePath: v.aboutImagePath || null,
    extendedVideoPath: v.extendedVideoPath || null,
  });
}

export default function AdminAboutEditorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [baseline, setBaseline] = useState(null);

  const [shortBio, setShortBio] = useState("");
  const [longBio, setLongBio] = useState("");
  const [valuesText, setValuesText] = useState("");

  const [extendedVideoUrl, setExtendedVideoUrl] = useState("");
  const [extendedVideoPath, setExtendedVideoPath] = useState(null);

  const [aboutImagePath, setAboutImagePath] = useState(null);
  const [isPublished, setIsPublished] = useState(false);

  const aboutImageUrl = useMemo(() => {
    if (!aboutImagePath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(aboutImagePath).data.publicUrl;
  }, [aboutImagePath]);

  const extendedVideoFileUrl = useMemo(() => {
    if (!extendedVideoPath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(extendedVideoPath).data.publicUrl;
  }, [extendedVideoPath]);

  const currentSnapshot = snapshotOf({
    shortBio,
    longBio,
    valuesText,
    extendedVideoUrl,
    isPublished,
    aboutImagePath,
    extendedVideoPath,
  });
  const dirty = baseline !== null && baseline !== currentSnapshot;

  const applyRow = (r) => {
    setShortBio(r.short_bio || "");
    setLongBio(r.long_bio || "");

    const valuesArr = Array.isArray(r.values_json) ? r.values_json : [];
    const normalized = valuesArr.map((v) => (typeof v === "string" ? v : v?.text)).filter(Boolean);
    const nextValuesText = normalized.join("\n");
    setValuesText(nextValuesText);

    setExtendedVideoUrl(r.extended_video_url || "");
    setExtendedVideoPath(r.extended_video_path || null);
    setAboutImagePath(r.about_image_path || null);
    setIsPublished(!!r.is_published);

    setBaseline(
      snapshotOf({
        shortBio: r.short_bio,
        longBio: r.long_bio,
        valuesText: nextValuesText,
        extendedVideoUrl: r.extended_video_url,
        isPublished: r.is_published,
        aboutImagePath: r.about_image_path || null,
        extendedVideoPath: r.extended_video_path || null,
      })
    );
  };

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

      applyRow(r);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const parseValues = () =>
    (valuesText || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

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

  const uploadVideo = async (file) => {
    if (!file) return null;

    if (!file.type?.startsWith("video/")) {
      throw new Error("Please select a valid video file.");
    }

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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        short_bio: shortBio || "",
        long_bio: longBio || "",
        values_json: parseValues(),
        extended_video_url: extendedVideoUrl || null,
        extended_video_path: extendedVideoPath || null,
        about_image_path: aboutImagePath,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updErr } = await supabase
        .from("section_about")
        .update(payload)
        .eq("id", 1)
        .select("*")
        .single();

      if (updErr) throw updErr;

      applyRow(data);
      setNotice("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
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
      setNotice("Image uploaded. Save to apply it.");
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const onAboutVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadVideo(file);
      setExtendedVideoPath(path);
      setNotice("Video uploaded. Save to apply it.");
    } catch (err) {
      setError(err.message || "Video upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted py-4">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Loading the About editor…
      </div>
    );
  }

  return (
    <AdminPageShell
      preview="/about#about"
      dirty={dirty}
      saving={saving}
      onSave={handleSave}
      error={error}
      notice={notice}
    >
      <AdminSection
        title="Your story"
        description="The bio, values, and video shown on your About page."
      >
        <div className="mb-3">
          <label className="form-label">Short bio</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="A quick 1-2 sentence intro about who you are and what you do."
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
          />
          <div className="form-text">The quick summary that appears first.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Full bio</label>
          <textarea
            className="form-control"
            rows="8"
            placeholder="Tell your story, background, and what makes your approach different."
            value={longBio}
            onChange={(e) => setLongBio(e.target.value)}
          />
          <div className="form-text">Include background, strengths, and the outcomes you deliver.</div>
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
          <div className="form-text">List 3-6 values that describe how you work.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Extended video link (optional)</label>
          <input
            className="form-control"
            placeholder="https://youtu.be/your-story"
            value={extendedVideoUrl}
            onChange={(e) => setExtendedVideoUrl(e.target.value)}
          />
          <div className="form-text">A YouTube or Vimeo link. If you upload a file below, the file is used instead.</div>
        </div>

        <div className="mt-4">
          <AdminVisibilityToggle
            checked={isPublished}
            onChange={setIsPublished}
            help="Turn this on when your About page is ready for visitors."
          />
        </div>
      </AdminSection>

      <AdminSection title="Media" description="A photo and an optional longer video for your About page.">
        <div className="mb-3">
          <label className="form-label">About image</label>
          <input className="form-control" type="file" accept="image/*" onChange={onAboutImageFile} disabled={saving} />
          <div className="form-text">A clear portrait or lifestyle image (1200px wide or more).</div>
          {aboutImageUrl ? (
            <div className="mt-2">
              <img src={aboutImageUrl} alt="About" className="img-fluid rounded border" />
            </div>
          ) : (
            <div className="small text-muted mt-2">No image yet.</div>
          )}
        </div>

        <hr />

        <div>
          <label className="form-label">Extended video (upload)</label>
          <input
            className="form-control"
            type="file"
            accept="video/mp4,video/webm,video/*"
            onChange={onAboutVideoFile}
            disabled={saving}
          />
          <div className="form-text">A longer intro or case story (15-90 seconds). MP4 recommended, under 50MB.</div>

          {extendedVideoFileUrl ? (
            <div className="mt-2">
              <div className="ratio ratio-16x9">
                <video src={extendedVideoFileUrl} controls playsInline preload="metadata" />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger mt-2"
                disabled={saving}
                onClick={() => {
                  setExtendedVideoPath(null);
                  setNotice("Video cleared. Save to apply it.");
                }}
              >
                <i className="fa-solid fa-trash me-2"></i>Remove video
              </button>
            </div>
          ) : (
            <div className="small text-muted mt-2">No video yet.</div>
          )}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}
