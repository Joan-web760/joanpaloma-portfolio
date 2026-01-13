// src/components/sections/HomeSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const MEDIA_BUCKET = "portfolio-media";

function getPublicUrl(bucket, path) {
  if (!path) return "";
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

function isProbablyYoutubeOrEmbed(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be|vimeo\.com|\/embed\//i.test(url);
}

export default function HomeSection() {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);

  const heroUrl = useMemo(() => getPublicUrl(MEDIA_BUCKET, row?.hero_image_path), [row?.hero_image_path]);

  const profileUrl = useMemo(
    () => getPublicUrl(MEDIA_BUCKET, row?.profile_image_path),
    [row?.profile_image_path]
  );

  // NEW: video file stored in Supabase Storage (recommended)
  const introVideoFileUrl = useMemo(
    () => getPublicUrl(MEDIA_BUCKET, row?.intro_video_path),
    [row?.intro_video_path]
  );

  // Existing: iframe URL (youtube embed link, etc.)
  const introVideoUrl = row?.intro_video_url || "";

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("section_home")
        .select("*")
        .eq("id", 1)
        .eq("is_published", true)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("HomeSection load error:", error);
        setRow(null);
        setLoading(false);
        return;
      }

      setRow(data || null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground sectionKey="home">
        <section id="home" className="py-5">
          <div className="container text-muted">Loading...</div>
        </section>
      </SectionBackground>
    );
  }

  // If not published yet, show nothing (public)
  if (!row) return null;

  const badges = Array.isArray(row.badges) ? row.badges : [];

  const heroStyle = heroUrl
    ? {
        backgroundImage: `url(${heroUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  // Decide video source priority:
  // 1) Uploaded file (intro_video_path)
  // 2) URL embed (intro_video_url)
  const hasFileVideo = !!introVideoFileUrl;
  const hasEmbedVideo = !!introVideoUrl;

  return (
    <SectionBackground sectionKey="home" className="py-0">
      <section id="home" className="py-5" style={heroStyle}>
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-7">
              <div className="p-4 rounded bg-white bg-opacity-75 border">
                <h1 className="display-6 fw-bold mb-2">{row.headline}</h1>
                <p className="lead mb-3">{row.subheadline}</p>

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
                  <a className="btn btn-primary" href={row.primary_cta_url || "#contact"}>
                    {row.primary_cta_label || "Primary CTA"}
                  </a>
                  <a className="btn btn-outline-dark" href={row.secondary_cta_url || "#portfolio"}>
                    {row.secondary_cta_label || "Secondary CTA"}
                  </a>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  {profileUrl ? (
                    <img src={profileUrl} alt="Profile" className="img-fluid rounded mb-3" />
                  ) : null}

                  {/* VIDEO: Storage file */}
                  {hasFileVideo ? (
                    <div className="ratio ratio-16x9">
                      <video
                        src={introVideoFileUrl}
                        className="w-100 h-100 rounded"
                        controls
                        playsInline
                        preload="metadata"
                      >
                        Sorry, your browser doesn’t support embedded videos.
                      </video>
                    </div>
                  ) : hasEmbedVideo ? (
                    // VIDEO: URL embed fallback
                    isProbablyYoutubeOrEmbed(introVideoUrl) ? (
                      <div className="ratio ratio-16x9">
                        <iframe
                          src={introVideoUrl}
                          title="Intro Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="text-muted small">
                        Intro video URL is set but doesn’t look like an embed URL.
                      </div>
                    )
                  ) : (
                    <div className="text-muted small">No intro video configured.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SectionBackground>
  );
}
