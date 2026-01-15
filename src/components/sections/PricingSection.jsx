// src/components/sections/PricingSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const asArr = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean);

export default function PricingSection() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const sorted = useMemo(() => {
    return (items || []).slice().sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [items]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("package_items")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("PricingSection load error:", error);
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
      <SectionBackground sectionKey="pricing" id="pricing" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!sorted.length) return null;

  return (
    <SectionBackground sectionKey="pricing" id="pricing" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Pricing</h2>
          <p className="text-muted mb-0">Clear packages to set expectations and speed up decisions.</p>
        </div>

        <div className="row g-3">
          {sorted.map((p) => {
            const inclusions = asArr(p.inclusions);
            const addons = asArr(p.addons);

            return (
              <div className="col-12 col-md-6 col-lg-4" key={p.id}>
                <div className={`card border-0 shadow-sm h-100 ${p.is_featured ? "border border-warning" : ""}`}>
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-center gap-2">
                      <div className="fw-semibold">{p.name}</div>
                      {p.is_featured ? <span className="badge text-bg-warning ms-auto">Featured</span> : null}
                    </div>

                    {p.description ? <div className="text-muted small mt-2">{p.description}</div> : null}

                    {p.price || p.billing_type ? (
                      <div className="mt-3">
                        <div className="h3 mb-0">{p.price || "—"}</div>
                        {p.billing_type ? <div className="text-muted small">{p.billing_type}</div> : null}
                      </div>
                    ) : null}

                    {inclusions.length ? (
                      <div className="mt-3">
                        <div className="fw-semibold mb-2">Inclusions</div>
                        <ul className="mb-0">
                          {inclusions.map((x, idx) => (
                            <li key={idx}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {addons.length ? (
                      <div className="mt-3">
                        <div className="fw-semibold mb-2">Add-ons</div>
                        <ul className="mb-0">
                          {addons.map((x, idx) => (
                            <li key={idx}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <a className="btn btn-outline-dark mt-auto" href="/#contact">
                      <i className="fa-solid fa-paper-plane me-2"></i>Get Started
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
