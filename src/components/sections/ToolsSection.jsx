// src/components/sections/ToolsSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const TOOL_COLORS = [
  "#1f6feb",
  "#d946ef",
  "#f97316",
  "#22c55e",
  "#0ea5e9",
  "#e11d48",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
];

const hashString = (value) => {
  const str = String(value || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const pickToolColor = (seed) => TOOL_COLORS[hashString(seed) % TOOL_COLORS.length];

const resolveIcon = (icon) => {
  const raw = String(icon || "").trim();
  if (!raw) return "fa-solid fa-screwdriver-wrench";
  if (/(^|\s)fa-(solid|regular|brands|light|thin|duotone)\b/.test(raw)) return raw;
  if (raw.startsWith("fa-")) return `fa-solid ${raw}`;
  return `fa-solid fa-${raw}`;
};

export default function ToolsSection() {
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

      const { data, error } = await supabase
        .from("tool_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("ToolsSection load error:", error);
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
      <SectionBackground sectionKey="tools" id="tools" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!itemsSorted.length) return null;

  return (
    <SectionBackground sectionKey="tools" id="tools" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Tools</h2>
        </div>

        <div className="row g-3">
          {itemsSorted.map((it) => {
            const iconClass = resolveIcon(it.icon);
            const name = String(it.name || "").trim() || "Tool";
            const category = String(it.category || "").trim();
            const description = String(it.description || "").trim();
            const url = String(it.url || "").trim();
            const iconColor = pickToolColor(`${it.id || ""}-${name}`);

            return (
              <div className="col-12 col-md-6 col-lg-4" key={it.id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="rounded-circle bg-light d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 48, height: 48 }}
                      >
                        <i className={iconClass} style={{ color: iconColor }} aria-hidden="true"></i>
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <div className="fw-semibold">{name}</div>
                          {category ? (
                            <span className="badge text-bg-light border text-muted">{category}</span>
                          ) : null}
                        </div>
                        {description ? <div className="text-muted small mt-1">{description}</div> : null}
                      </div>
                    </div>

                    {url ? (
                      <a className="btn btn-outline-dark btn-sm mt-auto align-self-start" href={url} target="_blank" rel="noreferrer">
                        <i className="fa-solid fa-arrow-up-right-from-square me-2"></i>
                        Visit
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
