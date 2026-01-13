"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

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

            const { data } = await supabase
                .from("section_resume")
                .select("*")
                .eq("is_published", true)
                .limit(1)
                .maybeSingle();

            if (!alive) return;

            setRow(data || null);
            setLoading(false);
        })();

        return () => {
            alive = false;
        };
    }, []);

    if (loading) {
        return (
            <section id="resume" className="py-5 bg-light">
                <div className="container text-muted">Loading...</div>
            </section>
        );
    }

    if (!row) {
        return (
            <section id="resume" className="py-5 bg-light">
                <div className="container">
                    <h2 className="h3 mb-2">Resume</h2>
                    <p className="text-muted mb-0">Resume content will be available soon.</p>
                </div>
            </section>
        );
    }


    return (
        <section id="resume" className="py-5 bg-light">
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
        </section>
    );
}
