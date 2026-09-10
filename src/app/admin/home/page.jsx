"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminSection from "@/components/admin/AdminSection";
import AdminVisibilityToggle from "@/components/admin/AdminVisibilityToggle";
import { HOMEPAGE_SECTIONS, isHomepageSectionVisible } from "@/lib/homepage-sections";
import {
  clampProfileImageScale,
  HERO_CONTENT_WIDTHS,
  normalizeHeroContentWidth,
  PROFILE_IMAGE_SCALE_DEFAULT,
  PROFILE_IMAGE_SCALE_MAX,
  PROFILE_IMAGE_SCALE_MIN,
} from "@/lib/home-hero";

const DEFAULT_BADGES = ["Next.js", "Supabase", "Bootstrap", "React"];
const MEDIA_BUCKET = "portfolio-media";

// simple safe filename
function safeExt(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext.replace(/[^a-z0-9]/g, "");
}

// One string that changes whenever any editable field changes, so we can show
// "Unsaved changes" and only enable Save when there is something to save.
function snapshotOf(v) {
  return JSON.stringify({
    headline: v.headline || "",
    subheadline: v.subheadline || "",
    primaryCtaLabel: v.primaryCtaLabel || "",
    primaryCtaUrl: v.primaryCtaUrl || "",
    secondaryCtaLabel: v.secondaryCtaLabel || "",
    secondaryCtaUrl: v.secondaryCtaUrl || "",
    introVideoUrl: v.introVideoUrl || "",
    badgesText: v.badgesText || "",
    isPublished: !!v.isPublished,
    sectionVisibility: v.sectionVisibility || {},
    profileImageScale: clampProfileImageScale(v.profileImageScale),
    heroContentWidth: normalizeHeroContentWidth(v.heroContentWidth),
    heroImagePath: v.heroImagePath || null,
    profileImagePath: v.profileImagePath || null,
    introVideoPath: v.introVideoPath || null,
  });
}

export default function AdminHomeEditorPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [row, setRow] = useState(null);
  const [baseline, setBaseline] = useState(null);

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState("");
  const [primaryCtaUrl, setPrimaryCtaUrl] = useState("");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState("");
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState("");

  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [badgesText, setBadgesText] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({});
  const [profileImageScale, setProfileImageScale] = useState(PROFILE_IMAGE_SCALE_DEFAULT);
  const [heroContentWidth, setHeroContentWidth] = useState("md");

  const [heroImagePath, setHeroImagePath] = useState(null);
  const [profileImagePath, setProfileImagePath] = useState(null);
  const [introVideoPath, setIntroVideoPath] = useState(null);

  const heroUrl = useMemo(() => {
    if (!heroImagePath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(heroImagePath).data.publicUrl;
  }, [heroImagePath]);

  const profileUrl = useMemo(() => {
    if (!profileImagePath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(profileImagePath).data.publicUrl;
  }, [profileImagePath]);

  const introVideoFileUrl = useMemo(() => {
    if (!introVideoPath) return "";
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(introVideoPath).data.publicUrl;
  }, [introVideoPath]);

  const currentSnapshot = snapshotOf({
    headline,
    subheadline,
    primaryCtaLabel,
    primaryCtaUrl,
    secondaryCtaLabel,
    secondaryCtaUrl,
    introVideoUrl,
    badgesText,
    isPublished,
    sectionVisibility,
    profileImageScale,
    heroContentWidth,
    heroImagePath,
    profileImagePath,
    introVideoPath,
  });
  const dirty = baseline !== null && baseline !== currentSnapshot;

  const applyRow = (r) => {
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
    setIntroVideoPath(r.intro_video_path || null);

    setIsPublished(!!r.is_published);
    const nextVisibility =
      r.homepage_sections && typeof r.homepage_sections === "object" ? r.homepage_sections : {};
    setSectionVisibility(nextVisibility);
    const nextScale = clampProfileImageScale(r.profile_image_scale ?? PROFILE_IMAGE_SCALE_DEFAULT);
    setProfileImageScale(nextScale);
    const nextWidth = normalizeHeroContentWidth(r.hero_content_width);
    setHeroContentWidth(nextWidth);

    setBaseline(
      snapshotOf({
        headline: r.headline,
        subheadline: r.subheadline,
        primaryCtaLabel: r.primary_cta_label,
        primaryCtaUrl: r.primary_cta_url,
        secondaryCtaLabel: r.secondary_cta_label,
        secondaryCtaUrl: r.secondary_cta_url,
        introVideoUrl: r.intro_video_url,
        badgesText: badgeArr.join(", "),
        isPublished: r.is_published,
        sectionVisibility: nextVisibility,
        profileImageScale: nextScale,
        heroContentWidth: nextWidth,
        heroImagePath: r.hero_image_path || null,
        profileImagePath: r.profile_image_path || null,
        introVideoPath: r.intro_video_path || null,
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
        router.replace("/admin/login?next=/admin/home");
        return;
      }

      const { data, error: dbErr } = await supabase.from("section_home").select("*").eq("id", 1).maybeSingle();

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load Home section.");
        setLoading(false);
        return;
      }

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

      applyRow(r);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const toggleSection = (key) => {
    setSectionVisibility((prev) => ({
      ...prev,
      [key]: !isHomepageSectionVisible(prev, key),
    }));
  };

  const setAllSections = (visible) => {
    setSectionVisibility(Object.fromEntries(HOMEPAGE_SECTIONS.map(({ key }) => [key, visible])));
  };

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
    const path = `home/intro/${filename}`;

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
        headline: headline || "",
        subheadline: subheadline || "",
        primary_cta_label: primaryCtaLabel || "",
        primary_cta_url: primaryCtaUrl || "",
        secondary_cta_label: secondaryCtaLabel || "",
        secondary_cta_url: secondaryCtaUrl || "",
        intro_video_url: introVideoUrl || null,
        intro_video_path: introVideoPath || null,
        badges: parseBadges(),
        hero_image_path: heroImagePath,
        profile_image_path: profileImagePath,
        homepage_sections: sectionVisibility,
        profile_image_scale: clampProfileImageScale(profileImageScale),
        hero_content_width: normalizeHeroContentWidth(heroContentWidth),
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updErr } = await supabase
        .from("section_home")
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

  const onHeroFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadImage(file, "hero");
      setHeroImagePath(path);
      setNotice("Hero image uploaded. Save to apply it.");
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
      setNotice("Profile image uploaded. Save to apply it.");
    } catch (err) {
      setError(err.message || "Profile upload failed.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const onIntroVideoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path = await uploadVideo(file);
      setIntroVideoPath(path);
      setNotice("Intro video uploaded. Save to apply it.");
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
        Loading the Home editor…
      </div>
    );
  }

  return (
    <AdminPageShell
      preview="/#home"
      dirty={dirty}
      saving={saving}
      onSave={handleSave}
      error={error}
      notice={notice}
    >
      <AdminSection
        title="Hero content"
        description="The headline, intro sentence, buttons, and badges at the top of your homepage."
      >
        <div className="mb-3">
          <label className="form-label">Headline</label>
          <input
            className="form-control"
            placeholder="Helping founders scale operations"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <div className="form-text">Keep it short and bold. Aim for 4-8 words that describe your value.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Subheadline</label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="One sentence that explains who you help, what you do, and the result."
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
          />
          <div className="form-text">Give a clear promise and who it is for.</div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Primary button label</label>
            <input
              className="form-control"
              placeholder="Book a call"
              value={primaryCtaLabel}
              onChange={(e) => setPrimaryCtaLabel(e.target.value)}
            />
            <div className="form-text">Use an action verb people will click.</div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Primary button link</label>
            <input
              className="form-control"
              placeholder="https://calendly.com/yourname"
              value={primaryCtaUrl}
              onChange={(e) => setPrimaryCtaUrl(e.target.value)}
            />
            <div className="form-text">A full link, or a section on your site such as /#contact.</div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Secondary button label</label>
            <input
              className="form-control"
              placeholder="View portfolio"
              value={secondaryCtaLabel}
              onChange={(e) => setSecondaryCtaLabel(e.target.value)}
            />
            <div className="form-text">Optional second action for browsing.</div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Secondary button link</label>
            <input
              className="form-control"
              placeholder="/#portfolio"
              value={secondaryCtaUrl}
              onChange={(e) => setSecondaryCtaUrl(e.target.value)}
            />
            <div className="form-text">A section on your site, or a full link.</div>
          </div>
        </div>

        <div className="mt-3">
          <label className="form-label">Badges</label>
          <input
            className="form-control"
            placeholder="Next.js, Supabase, Bootstrap"
            value={badgesText}
            onChange={(e) => setBadgesText(e.target.value)}
          />
          <div className="form-text">Separate with commas. List 3-6 tools or specialties for quick credibility.</div>
        </div>

        <div className="mt-3">
          <label className="form-label" htmlFor="heroContentWidth">
            Content width
          </label>
          <select
            id="heroContentWidth"
            className="form-select"
            value={heroContentWidth}
            onChange={(e) => setHeroContentWidth(e.target.value)}
          >
            {HERO_CONTENT_WIDTHS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="form-text">
            How wide the text block is on desktop. Larger leaves less room for the profile image or video beside it.
          </div>
        </div>

        <div className="mt-3">
          <label className="form-label">Intro video link (optional)</label>
          <input
            className="form-control"
            placeholder="https://youtu.be/your-intro"
            value={introVideoUrl}
            onChange={(e) => setIntroVideoUrl(e.target.value)}
          />
          <div className="form-text">A YouTube or Vimeo link. If you upload a file below, the file is used instead.</div>
        </div>

        <div className="mt-4">
          <AdminVisibilityToggle
            checked={isPublished}
            onChange={setIsPublished}
            help="Turn this on when your hero is ready for visitors. When off, the whole homepage hero is hidden."
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Homepage sections"
        description="Choose which sections appear on the homepage below the hero."
        actions={
          <>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAllSections(true)}>
              Show all
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAllSections(false)}>
              Hide all
            </button>
          </>
        }
      >
        <p className="form-text mt-0">
          The hero always shows. Turning a section off here removes it from the homepage even if that section is
          published. Links to a hidden section elsewhere on the site are unaffected.
        </p>

        {HOMEPAGE_SECTIONS.map(({ key, label }) => (
          <div className="form-check form-switch mb-2" key={key}>
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={isHomepageSectionVisible(sectionVisibility, key)}
              onChange={() => toggleSection(key)}
              id={`section-visible-${key}`}
            />
            <label className="form-check-label" htmlFor={`section-visible-${key}`}>
              Show {label} section
            </label>
          </div>
        ))}
      </AdminSection>

      <AdminSection title="Media" description="Images and video shown in the hero.">
        <div className="mb-3">
          <label className="form-label">Hero image</label>
          <input className="form-control" type="file" accept="image/*" onChange={onHeroFile} disabled={saving} />
          <div className="form-text">A wide, high-quality image (1600x900 or larger).</div>
          {heroUrl ? (
            <div className="mt-2">
              <img src={heroUrl} alt="Hero" className="img-fluid rounded border" />
            </div>
          ) : (
            <div className="small text-muted mt-2">No hero image yet.</div>
          )}
        </div>

        <hr />

        <div className="mb-3">
          <label className="form-label">Profile image</label>
          <input className="form-control" type="file" accept="image/*" onChange={onProfileFile} disabled={saving} />
          <div className="form-text">A clear headshot or brand photo (square works best).</div>
          {profileUrl ? (
            <div className="mt-2">
              <img
                src={profileUrl}
                alt="Profile"
                className="img-fluid rounded border d-block mx-auto"
                style={{ width: `${profileImageScale}%` }}
              />
            </div>
          ) : (
            <div className="small text-muted mt-2">No profile image yet.</div>
          )}

          <div className="mt-3">
            <label className="form-label d-flex justify-content-between" htmlFor="profileImageScale">
              <span>Profile image size</span>
              <span className="text-muted">{profileImageScale}%</span>
            </label>
            <input
              id="profileImageScale"
              type="range"
              className="form-range"
              min={PROFILE_IMAGE_SCALE_MIN}
              max={PROFILE_IMAGE_SCALE_MAX}
              step={5}
              value={profileImageScale}
              onChange={(e) => setProfileImageScale(clampProfileImageScale(e.target.value))}
            />
            <div className="form-text">Width of the profile image relative to its card on the homepage.</div>
          </div>
        </div>

        <hr />

        <div>
          <label className="form-label">Intro video (upload)</label>
          <input
            className="form-control"
            type="file"
            accept="video/mp4,video/webm,video/*"
            onChange={onIntroVideoFile}
            disabled={saving}
          />
          <div className="form-text">A short intro works best (15-60 seconds). MP4 recommended, under 50MB.</div>

          {introVideoFileUrl ? (
            <div className="mt-2">
              <div className="ratio ratio-16x9">
                <video src={introVideoFileUrl} controls playsInline preload="metadata" />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger mt-2"
                disabled={saving}
                onClick={() => {
                  setIntroVideoPath(null);
                  setNotice("Intro video cleared. Save to apply it.");
                }}
              >
                <i className="fa-solid fa-trash me-2"></i>Remove video
              </button>
            </div>
          ) : (
            <div className="small text-muted mt-2">No intro video yet.</div>
          )}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}
