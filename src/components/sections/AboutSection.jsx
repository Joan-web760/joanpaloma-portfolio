"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function AboutSection() {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);

  const aboutImageUrl = useMemo(() => {
    if (!row?.about_image_path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(row.about_image_path).data.publicUrl;
  }, [row?.about_image_path]);

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
      <section id="about" className="py-5">
        <div className="container text-muted">Loading...</div>
      </section>
    );
  }

  if (!row) return null;

  const valuesArr = Array.isArray(row.values_json) ? row.values_json : [];
  const values = valuesArr
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean);

  return (
    <section id="about" className="py-5">
      <div className="container">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-5">
            {aboutImageUrl ? (
              <img src={aboutImageUrl} alt="About" className="img-fluid rounded shadow-sm border" />
            ) : (
              <div className="p-4 border rounded bg-light text-muted">
                About image not set.
              </div>
            )}
          </div>

          <div className="col-12 col-lg-7">
            <h2 className="h3 mb-3">About</h2>

            {row.short_bio ? (
              <p className="lead mb-3">{row.short_bio}</p>
            ) : null}

            {row.long_bio ? (
              <div className="mb-3">
                {row.long_bio.split("\n").map((line, idx) => (
                  <p key={idx} className="mb-2">{line}</p>
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

            {row.extended_video_url ? (
              <div className="mt-4">
                <h3 className="h6 text-muted mb-2">More about me</h3>
                <div className="ratio ratio-16x9">
                  <iframe
                    src={row.extended_video_url}
                    title="Extended About Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
