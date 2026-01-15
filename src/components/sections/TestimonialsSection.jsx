// src/components/sections/TestimonialsSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

function Stars({ rating }) {
  const n = Math.max(1, Math.min(5, Number(rating || 5)));
  return (
    <div className="text-warning">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={`fa-solid fa-star${i < n ? "" : " text-muted"}`}></i>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  const sorted = useMemo(() => {
    return (items || [])
      .slice()
      .sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
  }, [items]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("testimonial_items")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("TestimonialsSection load error:", error);
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
      <SectionBackground sectionKey="testimonials" id="testimonials" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!sorted.length) return null;

  return (
    <SectionBackground sectionKey="testimonials" id="testimonials" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Testimonials</h2>
          <p className="text-muted mb-0">What clients and teammates say.</p>
        </div>

        <div className="row g-3">
          {sorted.map((t) => {
            const img = t.avatar_path ? publicUrl(t.avatar_path) : "";
            const meta = [t.role, t.company].filter(Boolean).join(" • ");

            return (
              <div className="col-12 col-md-6 col-lg-4" key={t.id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex gap-3 align-items-center mb-2">
                      <div
                        className="rounded-circle border bg-light overflow-hidden d-flex align-items-center justify-content-center"
                        style={{ width: 56, height: 56 }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={t.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <i className="fa-solid fa-user text-muted"></i>
                        )}
                      </div>

                      <div className="flex-grow-1">
                        <div className="fw-semibold d-flex align-items-center gap-2">
                          {t.name}
                          {t.is_featured ? <span className="badge text-bg-warning">Featured</span> : null}
                        </div>
                        <div className="text-muted small">{meta || "—"}</div>
                      </div>
                    </div>

                    <Stars rating={t.rating} />

                    <blockquote className="mt-3 mb-0 text-muted" style={{ fontStyle: "italic" }}>
                      “{t.quote}”
                    </blockquote>
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
