// src/components/sections/CertificationsSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

export default function CertificationsSection() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  const sorted = useMemo(() => {
    return (items || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [items]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("certification_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("issued_date", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error("CertificationsSection load error:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(data || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground sectionKey="certifications" id="certifications" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!sorted.length) return null;

  return (
    <SectionBackground sectionKey="certifications" id="certifications" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Certifications</h2>
        </div>

        <div className="row g-3">
          {sorted.map((c) => {
            const img = c.certificate_image_path ? publicUrl(c.certificate_image_path) : "";

            return (
              <div className="col-12 col-md-6 col-lg-4" key={c.id}>
                <div className="card border-0 shadow-sm h-100">
                  {img ? (
                    <img
                      src={img}
                      alt={c.title}
                      className="card-img-top"
                      style={{ height: 180, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="bg-white border-bottom d-flex align-items-center justify-content-center"
                      style={{ height: 180 }}
                    >
                      <span className="text-muted small">No image</span>
                    </div>
                  )}

                  <div className="card-body d-flex flex-column">
                    <div className="fw-semibold">{c.title}</div>

                    <div className="text-muted small mt-1">
                      {[c.provider, c.issued_date].filter(Boolean).join(" • ") || "—"}
                    </div>

                    {c.verification_url ? (
                      <a
                        className="btn btn-outline-dark mt-3"
                        href={c.verification_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="fa-solid fa-shield-check me-2"></i>
                        Verify
                      </a>
                    ) : (
                      <div className="mt-auto"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionBackground>
  );
}
