"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!slug) return;

      setLoading(true);

      const { data } = await supabase
        .from("blog_posts")
        .select("title,excerpt,content,cover_image_path,published_at")
        .eq("is_published", true)
        .eq("slug", slug)
        .maybeSingle();

      if (!alive) return;

      setPost(data || null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted py-4">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Loading the post…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="admin-page">
        <div className="alert alert-warning">This post was not found, or it is not published.</div>
        <Link className="btn btn-outline-secondary" href="/admin/blog">
          <i className="fa-solid fa-arrow-left me-2"></i>Back to Blog posts
        </Link>
      </div>
    );
  }

  const img = post.cover_image_path ? publicUrl(post.cover_image_path) : "";
  const dateLabel = post.published_at ? new Date(post.published_at).toLocaleString() : "";

  return (
    <div className="admin-page">
        <Link className="btn btn-outline-secondary" href="/admin/blog">
          <i className="fa-solid fa-arrow-left me-2"></i>Back to Blog posts
        </Link>

        <div className="card border-0 shadow-sm">
          {img ? (
            <img src={img} alt={post.title} className="card-img-top" style={{ maxHeight: 380, objectFit: "cover" }} />
          ) : null}

          <div className="card-body">
            <h1 className="h3 mb-1">{post.title}</h1>
            {dateLabel ? <div className="text-muted small mb-3">{dateLabel}</div> : null}
            {post.excerpt ? <p className="lead">{post.excerpt}</p> : null}

            <hr />

            {/* Plain text rendering with line breaks */}
            <div style={{ whiteSpace: "pre-wrap" }}>
              {post.content || ""}
            </div>
          </div>
        </div>
    </div>
  );
}
