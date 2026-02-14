// src/components/sections/SkillsSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const TYPE_LABELS = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  hard: "Hard Skills",
  tools: "Tools",
  soft: "Soft Skills",
  general: "General",
};

const SKILL_GRADIENTS = [
  ["#38bdf8", "#6366f1"],
  ["#f97316", "#ef4444"],
  ["#22c55e", "#14b8a6"],
  ["#a855f7", "#ec4899"],
  ["#f59e0b", "#f43f5e"],
  ["#06b6d4", "#3b82f6"],
  ["#84cc16", "#22c55e"],
  ["#e11d48", "#be123c"],
  ["#0ea5e9", "#2563eb"],
  ["#10b981", "#06b6d4"],
];

const TYPE_GRADIENTS = {
  frontend: ["#2563eb", "#38bdf8"],
  backend: ["#7c3aed", "#a855f7"],
  database: ["#0f766e", "#2dd4bf"],
  tools: ["#f59e0b", "#f97316"],
  soft: ["#f43f5e", "#fb7185"],
  hard: ["#0ea5e9", "#22d3ee"],
  general: ["#334155", "#94a3b8"],
};

const hashString = (value) => {
  const str = String(value || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const pickSkillGradient = (seed) => {
  const [from, to] = SKILL_GRADIENTS[hashString(seed) % SKILL_GRADIENTS.length];
  return `linear-gradient(90deg, ${from}, ${to})`;
};

const pickTypeGradient = (type) => {
  const pair = TYPE_GRADIENTS[type];
  if (pair) return `linear-gradient(90deg, ${pair[0]}, ${pair[1]})`;
  return pickSkillGradient(`type-${type}`);
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

  const categoryKeys = Object.keys(grouped);

  return (
    <SectionBackground sectionKey="skills" id="skills" className="py-5">
      <div className="container">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-4">
          <div>
            <h2 className="h3 mb-1">Skills</h2>
            <div className="text-muted small">
              Professional strengths across technical, operational, and soft skill domains.
            </div>
          </div>
          <div className="text-muted small">
            {skills.length} skills - {categoryKeys.length} categories
          </div>
        </div>

        <div className="row g-3">
          {categoryKeys.map((type) => {
            const list = grouped[type] || [];
            if (!list.length) return null;
            const typeGradient = pickTypeGradient(type);
            const typeLabel = TYPE_LABELS[type] || type;

            return (
              <div className="col-12 col-lg-6" key={type}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-pill"
                          aria-hidden="true"
                          style={{ width: 20, height: 6, backgroundImage: typeGradient }}
                        />
                        <h3 className="h6 text-muted mb-0">{typeLabel}</h3>
                      </div>
                      <span className="text-muted small">{list.length} skills</span>
                    </div>

                    <div className="vstack gap-3">
                      {list.map((s, idx) => {
                        const barGradient = typeGradient;

                        return (
                          <div key={s.id} className={idx ? "pt-2 border-top" : ""}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <div className="fw-semibold">{s.name}</div>
                              <span className="small text-muted">{s.level}%</span>
                            </div>

                            <div
                              className="progress rounded-pill"
                              role="progressbar"
                              aria-valuenow={s.level}
                              aria-valuemin="0"
                              aria-valuemax="100"
                              style={{ height: 6, backgroundColor: "#eef2f7" }}
                            >
                              <div
                                className="progress-bar rounded-pill"
                                style={{ width: `${s.level}%`, backgroundImage: barGradient }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
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
