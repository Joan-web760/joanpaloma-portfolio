// src/components/sections/PortfolioSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const asTextArr = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean);

export default function PortfolioSection() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [media, setMedia] = useState([]);

  const [activeId, setActiveId] = useState(null);

  const mediaByItem = useMemo(() => {
    const map = {};
    for (const it of items) map[it.id] = [];
    for (const m of media) {
      if (!map[m.portfolio_id]) map[m.portfolio_id] = [];
      map[m.portfolio_id].push(m);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [items, media]);

  const activeItem = useMemo(() => items.find((x) => x.id === activeId) || null, [items, activeId]);
  const activeMedia = useMemo(
    () => (activeItem ? mediaByItem[activeItem.id] || [] : []),
    [activeItem, mediaByItem]
  );

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: itData, error: itErr } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true });

      const { data: mData, error: mErr } = await supabase
        .from("portfolio_media")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (itErr || mErr) {
        console.error("PortfolioSection load error:", itErr || mErr);
        setItems([]);
        setMedia([]);
        setLoading(false);
        return;
      }

      setItems(itData || []);
      setMedia(mData || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const openModal = (id) => {
    setActiveId(id);
  };

  if (loading) {
    return (
      <SectionBackground sectionKey="portfolio" id="portfolio" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!items.length) return null;

  return (
    <SectionBackground sectionKey="portfolio" id="portfolio" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Portfolio</h2>
        </div>

        <div className="row g-3">
          {items.map((it) => {
            const list = mediaByItem[it.id] || [];
            const cover = list.find((m) => m.media_type === "image") || list[0];
            const coverUrl = cover ? publicUrl(cover.file_path) : "";

            return (
              <div className="col-12 col-md-6 col-lg-4" key={it.id}>
                <div className="card border-0 shadow-sm h-100">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={cover?.alt || it.title}
                      className="card-img-top"
                      style={{ height: 180, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="bg-light d-flex align-items-center justify-content-center"
                      style={{ height: 180 }}
                    >
                      <span className="text-muted small">No media</span>
                    </div>
                  )}

                  <div className="card-body d-flex flex-column">
                    <div className="d-flex gap-2 align-items-center mb-1">
                      <div className="fw-semibold">{it.title}</div>
                      {it.is_featured ? (
                        <span className="badge text-bg-warning ms-auto">Featured</span>
                      ) : null}
                    </div>

                    {it.subtitle ? (
                      <div className="text-muted small mb-2">{it.subtitle}</div>
                    ) : null}

                    {Array.isArray(it.tags) && it.tags.length ? (
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {asTextArr(it.tags)
                          .slice(0, 4)
                          .map((t, idx) => (
                            <span key={idx} className="badge text-bg-secondary">
                              {t}
                            </span>
                          ))}
                      </div>
                    ) : null}

                    <button
                      className="btn btn-outline-dark mt-auto"
                      data-bs-toggle="modal"
                      data-bs-target="#portfolioModal"
                      onClick={() => openModal(it.id)}
                    >
                      <i className="fa-solid fa-up-right-from-square me-2"></i>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        <div className="modal fade" id="portfolioModal" tabIndex="-1" aria-hidden="true">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <div className="h5 mb-0">{activeItem?.title || "Portfolio"}</div>
                  {activeItem?.subtitle ? (
                    <div className="text-muted small">{activeItem.subtitle}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body">
                {!activeItem ? (
                  <div className="text-muted">Select an item...</div>
                ) : (
                  <div className="row g-3">
                    <div className="col-12 col-lg-7">
                      {activeMedia.length ? (
                        <div className="vstack gap-3">
                          {activeMedia.map((m) => {
                            const url = publicUrl(m.file_path);
                            return (
                              <div key={m.id} className="border rounded overflow-hidden">
                                {m.media_type === "video" ? (
                                  <video src={url} controls style={{ width: "100%" }} />
                                ) : (
                                  <img
                                    src={url}
                                    alt={m.alt || activeItem.title}
                                    style={{ width: "100%" }}
                                  />
                                )}
                                {m.caption ? (
                                  <div className="p-2 small text-muted">{m.caption}</div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="border rounded p-4 bg-light text-muted">
                          No media available.
                        </div>
                      )}
                    </div>

                    <div className="col-12 col-lg-5">
                      {activeItem.description ? (
                        <div className="mb-3">
                          <div className="fw-semibold mb-1">Overview</div>
                          <p className="mb-0">{activeItem.description}</p>
                        </div>
                      ) : null}

                      {asTextArr(activeItem.results).length ? (
                        <div className="mb-3">
                          <div className="fw-semibold mb-1">Results</div>
                          <ul className="mb-0">
                            {asTextArr(activeItem.results).map((r, idx) => (
                              <li key={idx}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {asTextArr(activeItem.tags).length ? (
                        <div className="mb-3">
                          <div className="fw-semibold mb-2">Tags</div>
                          <div className="d-flex flex-wrap gap-2">
                            {asTextArr(activeItem.tags).map((t, idx) => (
                              <span key={idx} className="badge text-bg-secondary">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {activeItem.project_url || activeItem.repo_url ? (
                        <div className="d-grid gap-2">
                          {activeItem.project_url ? (
                            <a
                              className="btn btn-primary"
                              href={activeItem.project_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <i className="fa-solid fa-link me-2"></i>Live / Project Link
                            </a>
                          ) : null}
                          {activeItem.repo_url ? (
                            <a
                              className="btn btn-outline-dark"
                              href={activeItem.repo_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <i className="fa-brands fa-github me-2"></i>Repository
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionBackground>
  );
}
