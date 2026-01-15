// src/components/sections/SkillsSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const TYPE_LABELS = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  tools: "Tools",
  soft: "Soft Skills",
  general: "General",
};

export default function SkillsSection() {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState([]);

  const grouped = useMemo(() => {
    const map = {};
    for (const s of skills) {
      const type = s.type || "general";
      if (!map[type]) map[type] = [];
      map[type].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [skills]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("skill_items")
        .select("*")
        .eq("is_published", true)
        .order("type", { ascending: true })
        .order("sort_order", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("SkillsSection load error:", error);
        setSkills([]);
        setLoading(false);
        return;
      }

      setSkills(data || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground sectionKey="skills" id="skills" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!skills.length) return null;

  return (
    <SectionBackground sectionKey="skills" id="skills" className="py-5">
      <div className="container">
        <div className="mb-3">
          <h2 className="h3 mb-1">Skills</h2>
          <p className="text-muted mb-0">Core strengths and tools I use to deliver results.</p>
        </div>

        <div className="row g-3">
          {Object.keys(grouped).map((type) => {
            const list = grouped[type] || [];
            if (!list.length) return null;

            return (
              <div className="col-12 col-lg-6" key={type}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h3 className="h6 text-muted mb-3">{TYPE_LABELS[type] || type}</h3>

                    <div className="vstack gap-3">
                      {list.map((s) => (
                        <div key={s.id}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <div className="fw-semibold">{s.name}</div>
                            <div className="small text-muted">{s.level}%</div>
                          </div>

                          <div
                            className="progress"
                            role="progressbar"
                            aria-valuenow={s.level}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          >
                            <div className="progress-bar" style={{ width: `${s.level}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
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
