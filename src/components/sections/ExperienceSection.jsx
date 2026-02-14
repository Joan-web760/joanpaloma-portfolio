// src/components/sections/ExperienceSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const asTextArr = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((v) => (typeof v === "string" ? v : v?.text))
    .filter(Boolean);

const fmtDate = (d) => {
  if (!d) return "—";
  // d comes as "YYYY-MM-DD"
  const [y, m, day] = String(d).split("-");
  if (!y || !m) return d;
  const date = new Date(Number(y), Number(m) - 1, Number(day || 1));
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
};

export default function ExperienceSection({ className = "" } = {}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const sorted = useMemo(() => {
    // Sort by sort_order first (admin controlled), fallback by start_date desc
    return (items || []).slice().sort((a, b) => {
      const so = (a.sort_order || 0) - (b.sort_order || 0);
      if (so !== 0) return so;
      const ad = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bd = b.start_date ? new Date(b.start_date).getTime() : 0;
      return bd - ad;
    });
  }, [items]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("experience_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("start_date", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error("ExperienceSection load error:", error);
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
      <SectionBackground
        sectionKey="experience"
        id="experience"
        className={["py-5", className].filter(Boolean).join(" ")}
      >
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!sorted.length) return null;

  return (
    <SectionBackground
      sectionKey="experience"
      id="experience"
      className={["py-5", className].filter(Boolean).join(" ")}
    >
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Work Experience</h2>
        </div>

        <div className="vstack gap-3">
          {sorted.map((it) => {
            const responsibilities = asTextArr(it.responsibilities);
            const achievements = asTextArr(it.achievements);
            const tools = asTextArr(it.tools);
            const tags = asTextArr(it.tags);

            return (
              <div key={it.id} className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-2 align-items-start justify-content-between">
                    <div>
                      <div className="h5 mb-1">{it.role_title}</div>
                      <div className="text-muted">{[it.company, it.client].filter(Boolean).join(" • ")}</div>
                    </div>

                    <div className="text-muted small text-end">
                      <div>
                        {fmtDate(it.start_date)} → {it.is_current ? "Present" : fmtDate(it.end_date)}
                      </div>
                      {it.location ? <div>{it.location}</div> : null}
                    </div>
                  </div>

                  {it.summary ? <p className="mt-3 mb-2">{it.summary}</p> : null}

                  <div className="row g-3 mt-1">
                    {responsibilities.length ? (
                      <div className="col-12 col-lg-6">
                        <div className="fw-semibold mb-2">Responsibilities</div>
                        <ul className="mb-0">
                          {responsibilities.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {achievements.length ? (
                      <div className="col-12 col-lg-6">
                        <div className="fw-semibold mb-2">Achievements</div>
                        <ul className="mb-0">
                          {achievements.map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  {tools.length || tags.length ? (
                    <div className="mt-3 d-flex flex-wrap gap-2">
                      {tools.map((t, idx) => (
                        <span key={`tool_${idx}`} className="badge text-bg-dark">
                          {t}
                        </span>
                      ))}
                      {tags.map((t, idx) => (
                        <span key={`tag_${idx}`} className="badge text-bg-secondary">
                          {t}
                        </span>
                      ))}
                    </div>
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
