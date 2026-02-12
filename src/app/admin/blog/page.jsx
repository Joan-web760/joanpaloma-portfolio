"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_path: null,
  is_published: false,
};

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export default function AdminBlogPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);

  // if user edits title after initial slug generation, keep slug synced unless explicitly locked
  const [slugLocked, setSlugLocked] = useState(false);

  const coverUrl = useMemo(() => {
    if (!form.cover_image_path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(form.cover_image_path).data.publicUrl;
  }, [form.cover_image_path]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/blog");
        return;
      }

      const { data, error: dbErr } = await supabase
        .from("blog_posts")
        .select("*")
        .order("is_published", { ascending: true })
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (dbErr) {
        setError(dbErr.message || "Failed to load blog posts.");
        setLoading(false);
        return;
      }

      setPosts(data || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2200);
  };

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  const uploadCover = async (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
    const filename = `blog_${crypto.randomUUID()}.${safeExt}`;
    const path = `blog/covers/${filename}`;

    const { error: upErr } = await supabase.storage.from("portfolio-media").upload(path, file, { upsert: false });
    if (upErr) throw upErr;

    return path;
  };

  const createPost = async () => {
    const ok = await confirm({
      title: "Create post?",
      message: "This will add a new blog post to the list.",
      confirmText: "Create",
      confirmVariant: "primary",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const title = form.title.trim();
      if (!title) throw new Error("Title is required.");

      // auto slug from title (user never types slug)
      const slug = slugify(title);
      if (!slug) throw new Error("Slug is required.");

      const payload = {
        title,
        slug,
        excerpt: form.excerpt.trim() || null,
        content: form.content || "",
        cover_image_path: form.cover_image_path || null,
        is_published: !!form.is_published,
        published_at: form.is_published ? new Date().toISOString() : null,
      };

      const { data, error: insErr } = await supabase.from("blog_posts").insert([payload]).select("*").single();
      if (insErr) throw insErr;

      setPosts((prev) => [data, ...prev]);
      setForm(emptyForm);
      setSlugLocked(false);
      toast("Post created.");
      success({ title: "Post added", message: "The post was created successfully." });
    } catch (e) {
      setError(e.message || "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const updatePost = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (patch.is_published === true) patch.published_at = new Date().toISOString();
      if (patch.is_published === false) patch.published_at = null;

      const { data, error: updErr } = await supabase.from("blog_posts").update(patch).eq("id", id).select("*").single();
      if (updErr) throw updErr;

      setPosts((prev) => prev.map((p) => (p.id === id ? data : p)));
      toast("Saved.");
      success({ title: "Post updated", message: "Your changes have been saved.", autoCloseMs: 1000 });
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const deletePost = async (id) => {
    const ok = await confirm({
      title: "Delete post?",
      message: "This will permanently remove the post.",
      confirmText: "Delete",
      confirmVariant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: delErr } = await supabase.from("blog_posts").delete().eq("id", id);
      if (delErr) throw delErr;

      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast("Deleted.");
      success({ title: "Post deleted", message: "The post was removed." });
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const openPreviewList = () => window.open("/#blog", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Blog editor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Blog</h1>
            <div className="small text-muted">Draft/publish posts, consistent formatting, cover uploads.</div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreviewList}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>
            <button className="btn btn-outline-primary" onClick={() => router.push("/admin")}>
              <i className="fa-solid fa-arrow-left me-2"></i>Dashboard
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger py-2">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="alert alert-success py-2">
            <i className="fa-solid fa-circle-check me-2"></i>
            {notice}
          </div>
        ) : null}

        {/* Create */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Create Post</h2>

            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label">Title *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;

                    setForm((p) => {
                      const next = { ...p, title };

                      // auto-fill slug from title, and keep syncing unless user explicitly "locks"
                      if (!slugLocked) next.slug = slugify(title);

                      return next;
                    });
                  }}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Slug (auto)</label>
                <input className="form-control" value={form.slug} disabled readOnly />
                <div className="form-text">Auto-generated from Title (lowercase, numbers, hyphens).</div>

                {/* optional: let admin unlock + regenerate if you want; remove this block if you want fully forced */}
                <div className="d-flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy}
                    onClick={() => setSlugLocked((v) => !v)}
                  >
                    {slugLocked ? "Unlock slug sync" : "Lock slug"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy}
                    onClick={() => {
                      setSlugLocked(false);
                      setForm((p) => ({ ...p, slug: slugify(p.title) }));
                    }}
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Excerpt</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={form.excerpt}
                  onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Content (plain text / markdown-style)</label>
                <textarea
                  className="form-control"
                  rows="10"
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Cover Image (optional)</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setBusy(true);
                    setError("");
                    setNotice("");

                    try {
                      const path = await uploadCover(file);
                      setForm((p) => ({ ...p, cover_image_path: path }));
                      toast("Cover uploaded.");
                    } catch (err) {
                      setError(err.message || "Upload failed.");
                    } finally {
                      setBusy(false);
                      e.target.value = "";
                    }
                  }}
                />
                {coverUrl ? (
                  <div className="mt-2">
                    <img src={coverUrl} alt="Cover preview" className="img-fluid rounded border" />
                  </div>
                ) : (
                  <div className="small text-muted mt-2">No cover selected.</div>
                )}
              </div>

              <div className="col-12 col-md-6 d-flex align-items-end justify-content-between">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={!!form.is_published}
                    onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
                    disabled={busy}
                    id="newBlogPub"
                  />
                  <label className="form-check-label" htmlFor="newBlogPub">
                    Publish now
                  </label>
                </div>

                <button className="btn btn-primary" onClick={createPost} disabled={busy}>
                  <i className="fa-solid fa-plus me-2"></i>Create
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6 mb-3">Posts</h2>

            {!posts.length ? <div className="text-muted">No posts yet.</div> : null}

            <div className="vstack gap-2">
              {posts.map((p) => {
                const img = p.cover_image_path ? publicUrl(p.cover_image_path) : "";
                return (
                  <div key={p.id} className="border rounded bg-white p-3">
                    <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                      <div>
                        <div className="fw-semibold">
                          {p.title}{" "}
                          {p.is_published ? (
                            <span className="badge text-bg-success ms-2">Published</span>
                          ) : (
                            <span className="badge text-bg-secondary ms-2">Draft</span>
                          )}
                        </div>
                        <div className="text-muted small">
                          <span className="me-2">
                            <code>{p.slug}</code>
                          </span>
                          {p.published_at
                            ? `• Published: ${new Date(p.published_at).toLocaleString()}`
                            : `• Created: ${new Date(p.created_at).toLocaleString()}`}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <a className="btn btn-sm btn-outline-dark" href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                          <i className="fa-solid fa-up-right-from-square"></i>
                        </a>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deletePost(p.id)} disabled={busy}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div className="row g-2 mt-2">
                      <div className="col-12 col-md-8">
                        <label className="form-label">Title</label>
                        <input
                          className="form-control"
                          defaultValue={p.title}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (!v || v === p.title) return;

                            // also auto-update slug when title changes (no manual slug input)
                            updatePost(p.id, { title: v, slug: slugify(v) });
                          }}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">Slug</label>
                        <input className="form-control" value={p.slug} disabled readOnly />
                        <div className="form-text">Auto-generated from Title.</div>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Excerpt</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          defaultValue={p.excerpt || ""}
                          onBlur={(e) => updatePost(p.id, { excerpt: e.target.value.trim() || null })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Content</label>
                        <textarea
                          className="form-control"
                          rows="10"
                          defaultValue={p.content || ""}
                          onBlur={(e) => updatePost(p.id, { content: e.target.value })}
                          disabled={busy}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Replace Cover</label>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setBusy(true);
                            setError("");
                            setNotice("");

                            try {
                              const path = await uploadCover(file);
                              await updatePost(p.id, { cover_image_path: path });
                            } catch (err) {
                              setError(err.message || "Upload failed.");
                            } finally {
                              setBusy(false);
                              e.target.value = "";
                            }
                          }}
                        />

                        {img ? (
                          <div className="mt-2">
                            <img src={img} alt={p.title} className="img-fluid rounded border" />
                          </div>
                        ) : (
                          <div className="small text-muted mt-2">No cover.</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6 d-flex align-items-end">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            defaultChecked={!!p.is_published}
                            onChange={(e) => updatePost(p.id, { is_published: e.target.checked })}
                            disabled={busy}
                            id={`pub_${p.id}`}
                          />
                          <label className="form-check-label" htmlFor={`pub_${p.id}`}>
                            Published
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
