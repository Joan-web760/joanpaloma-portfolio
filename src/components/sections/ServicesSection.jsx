// src/components/sections/ServicesSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

export default function ServicesSection() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const itemsSorted = useMemo(() => {
    return (items || []).slice().sort((a, b) => {
      const ao = a.sort_order || 0;
      const bo = b.sort_order || 0;
      if (ao !== bo) return ao - bo;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  }, [items]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: itemData, error: itemErr } = await supabase
        .from("service_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (itemErr) {
        console.error("ServicesSection load error:", itemErr);
        setItems([]);
        setLoading(false);
        return;
      }

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

  if (!itemsSorted.length) return null;

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
          {itemsSorted.map((it) => {
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
      </div>
    </SectionBackground>
  );
}
