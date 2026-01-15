// src/components/sections/ServicesSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

export default function ServicesSection() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const itemsByCategory = useMemo(() => {
    const map = {};
    for (const c of categories) map[c.id] = [];
    for (const it of items) {
      if (!map[it.category_id]) map[it.category_id] = [];
      map[it.category_id].push(it);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [categories, items]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: catData, error: catErr } = await supabase
        .from("service_categories")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      const { data: itemData, error: itemErr } = await supabase
        .from("service_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (catErr || itemErr) {
        console.error("ServicesSection load error:", catErr || itemErr);
        setCategories([]);
        setItems([]);
        setLoading(false);
        return;
      }

      setCategories(catData || []);
      setItems(itemData || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground sectionKey="services" id="services" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!categories.length) return null;

  return (
    <SectionBackground sectionKey="services" id="services" className="py-5">
      <div className="container">
        <div className="d-flex align-items-end justify-content-between mb-3">
          <div>
            <h2 className="h3 mb-1">Services</h2>
            <p className="text-muted mb-0">Clear offerings so clients can self-qualify fast.</p>
          </div>
        </div>

        <div className="row g-3">
          {categories.map((c) => {
            const list = itemsByCategory[c.id] || [];

            return (
              <div className="col-12" key={c.id}>
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
                      <h3 className="h5 mb-0">{c.title}</h3>
                    </div>

                    {c.description ? (
                      <p className="text-muted mb-3">{c.description}</p>
                    ) : null}

                    {list.length ? (
                      <div className="row g-3">
                        {list.map((it) => {
                          const bullets = Array.isArray(it.bullets) ? it.bullets : [];

                          return (
                            <div className="col-12 col-md-6 col-lg-4" key={it.id}>
                              <div className="border rounded p-3 h-100 bg-white">
                                <div className="fw-semibold mb-1">{it.title}</div>
                                {it.description ? (
                                  <div className="text-muted small mb-2">{it.description}</div>
                                ) : null}

                                {bullets.length ? (
                                  <ul className="small mb-0">
                                    {bullets
                                      .map((b) => (typeof b === "string" ? b : b?.text))
                                      .filter(Boolean)
                                      .map((b, idx) => (
                                        <li key={idx}>{b}</li>
                                      ))}
                                  </ul>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-muted small">
                        No services published in this category yet.
                      </div>
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
