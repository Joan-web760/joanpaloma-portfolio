// src/components/sections/ResumeSection.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

export default function ResumeSection() {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);

  const cvUrl = useMemo(() => {
    if (!row?.cv_file_path) return "";
    return supabase.storage.from("portfolio-docs").getPublicUrl(row.cv_file_path).data.publicUrl;
  }, [row?.cv_file_path]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("section_resume")
        .select("*")
        .eq("is_published", true)
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("ResumeSection load error:", error);
        setRow(null);
        setLoading(false);
        return;
      }

      setRow(data || null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <SectionBackground sectionKey="resume" id="resume" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!row) {
    return (
      <SectionBackground sectionKey="resume" id="resume" className="py-5">
        <div className="container">
          <h2 className="h3 mb-2">Resume</h2>
          <p className="text-muted mb-0">Resume content will be available soon.</p>
        </div>
      </SectionBackground>
    );
  }

  return (
    <SectionBackground sectionKey="resume" id="resume" className="py-5">
      <div className="container">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-lg-8">
            <h2 className="h3 mb-2">Resume</h2>

            {row.summary ? (
              <p className="text-muted mb-0">{row.summary}</p>
            ) : (
              <p className="text-muted mb-0">Download my CV for full details.</p>
            )}
          </div>

          <div className="col-12 col-lg-4 d-grid">
            {cvUrl ? (
              <a className="btn btn-primary btn-lg" href={cvUrl} target="_blank" rel="noreferrer">
                <i className="fa-solid fa-download me-2"></i>
                {row.button_label || "Download CV"}
              </a>
            ) : (
              <button className="btn btn-secondary btn-lg" disabled>
                <i className="fa-solid fa-file-circle-xmark me-2"></i>
                CV not available
              </button>
            )}
          </div>
        </div>
      </div>
    </SectionBackground>
  );
}
