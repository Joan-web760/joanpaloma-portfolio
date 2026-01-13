"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const defaultSocials = {
    facebook: "",
    linkedin: "",
    github: "",
    x: "",
    instagram: "",
    youtube: "",
};

export default function ContactSection() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

    const socials = useMemo(() => ({ ...defaultSocials, ...(settings?.socials || {}) }), [settings]);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);

            const { data } = await supabase
                .from("section_contact_settings")
                .select("*")
                .eq("is_published", true)
                .limit(1)
                .maybeSingle();

            if (!alive) return;

            setSettings(data || null);
            setLoading(false);
        })();

        return () => {
            alive = false;
        };
    }, []);

    const submit = async (e) => {
        e.preventDefault();

        setBusy(true);
        setError("");
        setNotice("");

        try {
            if (!form.name.trim()) throw new Error("Name is required.");
            if (!form.email.trim()) throw new Error("Email is required.");
            if (!form.message.trim()) throw new Error("Message is required.");

            const { error: insErr } = await supabase.from("contact_messages").insert([{
                name: form.name.trim(),
                email: form.email.trim(),
                subject: form.subject.trim() || null,
                message: form.message.trim(),
                page_url: typeof window !== "undefined" ? window.location.href : null,
                user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            }]);

            if (insErr) throw insErr;

            setForm({ name: "", email: "", subject: "", message: "" });
            setNotice("Message sent! I’ll get back to you soon.");
            setTimeout(() => setNotice(""), 2500);
        } catch (err) {
            setError(err.message || "Submit failed.");
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <section id="contact" className="py-5">
                <div className="container text-muted">Loading...</div>
            </section>
        );
    }

    if (!settings) {
        return (
            <section id="contact" className="py-5">
                <div className="container">
                    <h2 className="h3 mb-1">Contact</h2>
                    <p className="text-muted mb-0">Contact details will be available soon.</p>
                </div>
            </section>
        );
    }


    return (
        <section id="contact" className="py-5">
            <div className="container">
                <div className="mb-3">
                    <h2 className="h3 mb-1">{settings.heading || "Contact"}</h2>
                    {settings.subheading ? <p className="text-muted mb-0">{settings.subheading}</p> : null}
                </div>

                <div className="row g-3">
                    {/* Form */}
                    <div className="col-12 col-lg-7">
                        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
                        {notice ? <div className="alert alert-success py-2">{notice}</div> : null}

                        <form className="card border-0 shadow-sm" onSubmit={submit}>
                            <div className="card-body">
                                <div className="row g-2">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Name *</label>
                                        <input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={busy} />
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label">Email *</label>
                                        <input className="form-control" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={busy} />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Subject</label>
                                        <input className="form-control" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} disabled={busy} />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Message *</label>
                                        <textarea className="form-control" rows="5" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} disabled={busy} />
                                    </div>

                                    <div className="col-12 d-flex justify-content-end">
                                        <button className="btn btn-primary" type="submit" disabled={busy}>
                                            <i className="fa-solid fa-paper-plane me-2"></i>
                                            {busy ? "Sending..." : "Send Message"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Contact info */}
                    <div className="col-12 col-lg-5">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <div className="fw-semibold mb-2">Contact Info</div>

                                {settings.public_email ? (
                                    <div className="mb-2">
                                        <i className="fa-solid fa-envelope me-2"></i>
                                        <a href={`mailto:${settings.public_email}`}>{settings.public_email}</a>
                                    </div>
                                ) : null}

                                {settings.phone ? (
                                    <div className="mb-2">
                                        <i className="fa-solid fa-phone me-2"></i>
                                        <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                                    </div>
                                ) : null}

                                {(settings.hours_text || settings.timezone) ? (
                                    <div className="mb-3 text-muted small">
                                        <i className="fa-regular fa-clock me-2"></i>
                                        {[settings.hours_text, settings.timezone].filter(Boolean).join(" • ")}
                                    </div>
                                ) : null}

                                {settings.booking_url ? (
                                    <a className="btn btn-outline-dark w-100 mb-3" href={settings.booking_url} target="_blank" rel="noreferrer">
                                        <i className="fa-solid fa-calendar-check me-2"></i>Book a Call
                                    </a>
                                ) : null}

                                <div className="fw-semibold mb-2">Socials</div>
                                <div className="d-flex flex-wrap gap-2">
                                    {Object.entries(socials).map(([key, url]) => {
                                        if (!url) return null;
                                        return (
                                            <a key={key} className="btn btn-outline-secondary btn-sm" href={url} target="_blank" rel="noreferrer">
                                                <i className={`fa-brands fa-${key === "x" ? "x-twitter" : key} me-2`}></i>
                                                {key}
                                            </a>
                                        );
                                    })}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
