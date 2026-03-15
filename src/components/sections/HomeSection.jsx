// src/components/sections/HomeSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const MEDIA_BUCKET = "portfolio-media";
const DOCS_BUCKET = "portfolio-docs";

// Adjust this once to match your navbar height
const NAVBAR_SPACER_CLASS = "pt-5 pt-lg-5"; // Bootstrap spacing

function getPublicUrl(bucket, path) {
  if (!path) return "";
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

function toYoutubeEmbed(url) {
  if (!url) return "";
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    return url;
  } catch {
    return url;
  }
}

function isEmbedUrl(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be|vimeo\.com|\/embed\//i.test(url);
}

export default function HomeSection() {
  const [loading, setLoading] = useState(true);
  const [homeRow, setHomeRow] = useState(null);
  const [resumeRow, setResumeRow] = useState(null);

  const profileUrl = useMemo(
    () => getPublicUrl(MEDIA_BUCKET, homeRow?.profile_image_path),
    [homeRow?.profile_image_path]
  );

  const introVideoFileUrl = useMemo(
    () => getPublicUrl(MEDIA_BUCKET, homeRow?.intro_video_path),
    [homeRow?.intro_video_path]
  );

  const introVideoEmbedUrl = useMemo(
    () => toYoutubeEmbed(homeRow?.intro_video_url || ""),
    [homeRow?.intro_video_url]
  );

  const cvUrl = useMemo(
    () => getPublicUrl(DOCS_BUCKET, resumeRow?.cv_file_path),
    [resumeRow?.cv_file_path]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const [homeResult, resumeResult] = await Promise.all([
        supabase
          .from("section_home")
          .select("*")
          .eq("id", 1)
          .eq("is_published", true)
          .maybeSingle(),
        supabase
          .from("section_resume")
          .select("*")
          .eq("is_published", true)
          .limit(1)
          .maybeSingle(),
      ]);

      if (!alive) return;

      if (homeResult.error) console.error("HomeSection load error:", homeResult.error);
      if (resumeResult.error) console.error("HomeSection resume load error:", resumeResult.error);

      setHomeRow(homeResult.data || null);
      setResumeRow(resumeResult.data || null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground
        sectionKey="home"
        id="home"
        className={`py-5 ${NAVBAR_SPACER_CLASS}`}
      >
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!homeRow) return null;

  const badges = Array.isArray(homeRow.badges) ? homeRow.badges : [];
  const hasFileVideo = !!introVideoFileUrl;
  const hasEmbedVideo = !!introVideoEmbedUrl;
  const resumeSummary = String(resumeRow?.summary || "").trim();
  const resumeButtonLabel = String(resumeRow?.button_label || "").trim() || "Download CV";

  const titleId = "home-hero-title";
  const subtitleId = "home-hero-subtitle";

  return (
    <SectionBackground
      sectionKey="home"
      id="home"
      className={`py-5 ${NAVBAR_SPACER_CLASS}`}
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
    >
      <div className="container">
        <div className="row align-items-center g-4">
          <div className="col-12 col-lg-7">
            <header className="p-4 rounded bg-white bg-opacity-75 border">
              <h1 id={titleId} className="display-6 fw-bold mb-2">
                {homeRow.headline}
              </h1>
              <p id={subtitleId} className="lead mb-3">
                {homeRow.subheadline}
              </p>

              {badges.length ? (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {badges.map((b, idx) => (
                    <span key={idx} className="badge text-bg-dark">
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="d-flex flex-wrap gap-2">
                <a className="btn btn-primary" href={homeRow.primary_cta_url || "#contact"}>
                  {homeRow.primary_cta_label || "Primary CTA"}
                </a>
                <a className="btn btn-outline-dark" href={homeRow.secondary_cta_url || "#portfolio"}>
                  {homeRow.secondary_cta_label || "Secondary CTA"}
                </a>
              </div>

              <div id="resume" className="mt-4 pt-4 border-top">
                <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
                  <div>
                    <h2 className="h4 mb-2">Resume</h2>
                    <p className="text-muted mb-0">
                      {resumeSummary || "Download my CV right away for the full overview of my background and experience."}
                    </p>
                  </div>

                  {cvUrl ? (
                    <a className="btn btn-dark btn-lg flex-shrink-0" href={cvUrl} target="_blank" rel="noreferrer">
                      <i className="fa-solid fa-download me-2"></i>
                      {resumeButtonLabel}
                    </a>
                  ) : (
                    <button className="btn btn-secondary btn-lg flex-shrink-0" disabled>
                      <i className="fa-solid fa-file-circle-xmark me-2"></i>
                      CV not available
                    </button>
                  )}
                </div>
              </div>
            </header>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt="Profile portrait"
                    className="img-fluid rounded mb-3"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : null}

                {hasFileVideo ? (
                  <div className="ratio ratio-16x9">
                    <video
                      src={introVideoFileUrl}
                      className="w-100 h-100 rounded"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                ) : hasEmbedVideo ? (
                  isEmbedUrl(introVideoEmbedUrl) ? (
                    <div className="ratio ratio-16x9">
                      <iframe
                        src={introVideoEmbedUrl}
                        title="Intro Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="text-muted small">
                      Intro video URL doesn’t look like an embed URL.
                    </div>
                  )
                ) : (
                  <div className="text-muted small">
                    No intro video configured.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionBackground>
  );
}
