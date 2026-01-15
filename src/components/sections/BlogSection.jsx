// src/components/sections/BlogSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

export default function BlogSection() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  const sorted = useMemo(() => {
    return (posts || []).slice().sort((a, b) => {
      const ad = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bd = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bd - ad;
    });
  }, [posts]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_path,published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error("BlogSection load error:", error);
        setPosts([]);
        setLoading(false);
        return;
      }

      setPosts(data || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground sectionKey="blog" id="blog" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!sorted.length) return null;

  return (
    <SectionBackground sectionKey="blog" id="blog" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Blog</h2>
          <p className="text-muted mb-0">Short articles on what I build and how I think.</p>
        </div>

        <div className="row g-3">
          {sorted.map((p) => {
            const img = p.cover_image_path ? publicUrl(p.cover_image_path) : "";
            const dateLabel = p.published_at ? new Date(p.published_at).toLocaleDateString() : "";

            return (
              <div className="col-12 col-md-6 col-lg-4" key={p.id}>
                <div className="card border-0 shadow-sm h-100">
                  {img ? (
                    <img
                      src={img}
                      alt={p.title}
                      className="card-img-top"
                      style={{ height: 180, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="bg-white border-bottom d-flex align-items-center justify-content-center"
                      style={{ height: 180 }}
                    >
                      <span className="text-muted small">No cover</span>
                    </div>
                  )}

                  <div className="card-body d-flex flex-column">
                    <div className="fw-semibold">{p.title}</div>
                    {dateLabel ? <div className="text-muted small mt-1">{dateLabel}</div> : null}
                    {p.excerpt ? <p className="text-muted small mt-2 mb-3">{p.excerpt}</p> : null}

                    <a className="btn btn-outline-dark mt-auto" href={`/blog/${p.slug}`}>
                      <i className="fa-solid fa-book-open me-2"></i>Read
                    </a>
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
