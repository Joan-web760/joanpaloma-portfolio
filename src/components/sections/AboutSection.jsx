// src/components/sections/AboutSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const MEDIA_BUCKET = "portfolio-media";

function getPublicUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function toYoutubeEmbed(url) {
  if (!url) return "";
  try {
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    // youtube.com/watch?v=<id>
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

export default function AboutSection({ className = "" } = {}) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);

  const aboutImageUrl = useMemo(() => getPublicUrl(row?.about_image_path), [row?.about_image_path]);

  const extendedVideoFileUrl = useMemo(
    () => getPublicUrl(row?.extended_video_path),
    [row?.extended_video_path]
  );

  const extendedVideoEmbedUrl = useMemo(
    () => toYoutubeEmbed(row?.extended_video_url || ""),
    [row?.extended_video_url]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("section_about")
        .select("*")
        .eq("id", 1)
        .eq("is_published", true)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("AboutSection load error:", error);
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
        sectionKey="about"
        id="about"
        className={["py-5", className].filter(Boolean).join(" ")}
      >
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!row) return null;

  const valuesArr = Array.isArray(row.values_json) ? row.values_json : [];
  const values = valuesArr.map((v) => (typeof v === "string" ? v : v?.text)).filter(Boolean);

  const hasFileVideo = !!extendedVideoFileUrl;
  const hasEmbedVideo = !!extendedVideoEmbedUrl && isEmbedUrl(extendedVideoEmbedUrl);

  return (
    <SectionBackground
      sectionKey="about"
      id="about"
      className={["py-5", className].filter(Boolean).join(" ")}
    >
      <div className="container">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-5">
            {aboutImageUrl ? (
              <img src={aboutImageUrl} alt="About" className="img-fluid rounded shadow-sm border" />
            ) : (
              <div className="p-4 border rounded bg-light text-muted">About image not set.</div>
            )}
          </div>

          <div className="col-12 col-lg-7">
            <h2 className="h3 mb-3">About</h2>

            {row.short_bio ? <p className="lead mb-3">{row.short_bio}</p> : null}

            {row.long_bio ? (
              <div className="mb-3">
                {row.long_bio.split("\n").map((line, idx) => (
                  <p key={idx} className="mb-2">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}

            {values.length ? (
              <div className="mt-4">
                <h3 className="h6 text-muted mb-2">Values</h3>
                <ul className="list-group">
                  {values.map((v, idx) => (
                    <li key={idx} className="list-group-item d-flex gap-2 align-items-start">
                      <i className="fa-solid fa-check mt-1 text-success"></i>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasFileVideo || hasEmbedVideo ? (
              <div className="mt-4">
                <h3 className="h6 text-muted mb-2">More about me</h3>

                {hasFileVideo ? (
                  <div className="ratio ratio-16x9">
                    <video
                      src={extendedVideoFileUrl}
                      className="w-100 h-100 rounded"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  </div>
                ) : (
                  <div className="ratio ratio-16x9">
                    <iframe
                      src={extendedVideoEmbedUrl}
                      title="Extended About Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </SectionBackground>
  );
}
