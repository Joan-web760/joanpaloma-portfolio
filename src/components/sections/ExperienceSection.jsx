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
  if (!d) return "-";
  const [y, m, day] = String(d).split("-");
  if (!y || !m) return d;
  const date = new Date(Number(y), Number(m) - 1, Number(day || 1));
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
};

export default function ExperienceSection({ className = "" } = {}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const sorted = useMemo(() => {
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

  const totalRoles = sorted.length;
  const currentRoles = sorted.filter((it) => it.is_current).length;
  const featuredTools = Array.from(
    new Set(sorted.flatMap((it) => asTextArr(it.tools)).filter(Boolean))
  ).slice(0, 6);

  return (
    <SectionBackground
      sectionKey="experience"
      id="experience"
      className={["py-5", className].filter(Boolean).join(" ")}
    >
      <div className="container experience-public">
        <div className="experience-public-header" data-aos="fade-up">
          <div>
            <div className="experience-public-kicker">Career Timeline</div>
            <h2 className="experience-public-title">Work Experience</h2>
          </div>

          <div className="experience-public-stats" aria-label="Experience overview">
            <div className="experience-public-stat">
              <span>{totalRoles}</span>
              <small>{totalRoles === 1 ? "Role" : "Roles"}</small>
            </div>
            {currentRoles ? (
              <div className="experience-public-stat">
                <span>{currentRoles}</span>
                <small>Current</small>
              </div>
            ) : null}
            {featuredTools.length ? (
              <div className="experience-public-stat experience-public-stat-wide">
                <span>{featuredTools.length}</span>
                <small>Core tools</small>
              </div>
            ) : null}
          </div>
        </div>

        {featuredTools.length ? (
          <div className="experience-public-tool-strip" data-aos="fade-up" data-aos-delay="80">
            {featuredTools.map((tool, idx) => (
              <span key={`${tool}_${idx}`}>{tool}</span>
            ))}
          </div>
        ) : null}

        <div className="experience-public-timeline">
          {sorted.map((it, index) => {
            const responsibilities = asTextArr(it.responsibilities);
            const achievements = asTextArr(it.achievements);
            const tools = asTextArr(it.tools);
            const tags = asTextArr(it.tags);
            const org = [it.company, it.client].filter(Boolean).join(" / ");
            const period = `${fmtDate(it.start_date)} - ${it.is_current ? "Present" : fmtDate(it.end_date)}`;

            return (
              <article
                key={it.id}
                className="experience-public-item"
                data-aos="fade-up"
                data-aos-delay={Math.min(index * 70, 280)}
              >
                <div className="experience-public-marker" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>

                <div className="experience-public-card">
                  <div className="experience-public-card-top">
                    <div className="experience-public-role">
                      {it.is_current ? <span className="experience-public-status">Current</span> : null}
                      <h3>{it.role_title}</h3>
                      {org ? <p>{org}</p> : null}
                    </div>

                    <div className="experience-public-meta">
                      <div>
                        <i className="fa-regular fa-calendar"></i>
                        <span>{period}</span>
                      </div>
                      {it.location ? (
                        <div>
                          <i className="fa-solid fa-location-dot"></i>
                          <span>{it.location}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {it.summary ? <p className="experience-public-summary">{it.summary}</p> : null}

                  <div className="experience-public-details">
                    {responsibilities.length ? (
                      <section className="experience-public-detail">
                        <h4>Responsibilities</h4>
                        <ul>
                          {responsibilities.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {achievements.length ? (
                      <section className="experience-public-detail">
                        <h4>Achievements</h4>
                        <ul>
                          {achievements.map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </div>

                  {tools.length || tags.length ? (
                    <div className="experience-public-chips">
                      {tools.map((t, idx) => (
                        <span key={`tool_${idx}`} className="experience-public-chip experience-public-chip-tool">
                          {t}
                        </span>
                      ))}
                      {tags.map((t, idx) => (
                        <span key={`tag_${idx}`} className="experience-public-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </SectionBackground>
  );
}
