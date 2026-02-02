// src/components/sections/HomeSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const MEDIA_BUCKET = "portfolio-media";

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
  const [row, setRow] = useState(null);

  const profileUrl = useMemo(
    () => getPublicUrl(MEDIA_BUCKET, row?.profile_image_path),
    [row?.profile_image_path]
  );

  const introVideoFileUrl = useMemo(
    () => getPublicUrl(MEDIA_BUCKET, row?.intro_video_path),
    [row?.intro_video_path]
  );

  const introVideoEmbedUrl = useMemo(
    () => toYoutubeEmbed(row?.intro_video_url || ""),
    [row?.intro_video_url]
  );

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
      <SectionBackground
        sectionKey="home"
        id="home"
        className={`py-5 ${NAVBAR_SPACER_CLASS}`}
      >
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!row) return null;

  const badges = Array.isArray(row.badges) ? row.badges : [];
  const hasFileVideo = !!introVideoFileUrl;
  const hasEmbedVideo = !!introVideoEmbedUrl;

  return (
    <SectionBackground
      sectionKey="home"
      id="home"
      className={`py-5 ${NAVBAR_SPACER_CLASS}`}
    >
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
                  <img
                    src={profileUrl}
                    alt="Profile"
                    className="img-fluid rounded mb-3"
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
