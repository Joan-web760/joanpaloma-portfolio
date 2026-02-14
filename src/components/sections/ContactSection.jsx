// src/components/sections/ContactSection.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import SectionBackground from "@/components/SectionBackground";

const defaultSocials = {
  facebook: "",
  linkedin: "",
  github: "",
  x: "",
  instagram: "",
  youtube: "",
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const createCaptcha = () => {
  const isMultiply = Math.random() < 0.5;
  const a = randomInt(1, 9);
  const b = randomInt(1, 9);
  const op = isMultiply ? "x" : "+";
  const answer = isMultiply ? a * b : a + b;

  return { a, b, op, answer };
};

const drawCaptcha = (canvas, captcha) => {
  if (!canvas || !captcha) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#f8f9fa";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(randomInt(0, width), randomInt(0, height));
    ctx.lineTo(randomInt(0, width), randomInt(0, height));
    ctx.stroke();
  }

  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(randomInt(0, width), randomInt(0, height), 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const text = `${captcha.a} ${captcha.op} ${captcha.b} = ?`;
  ctx.font = "700 26px Trebuchet MS, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#212529";
  const textWidth = ctx.measureText(text).width;
  ctx.fillText(text, (width - textWidth) / 2, height / 2);
};

export default function ContactSection() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [phTime, setPhTime] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [captcha, setCaptcha] = useState(() => createCaptcha());
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaAttempts, setCaptchaAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [lockRemaining, setLockRemaining] = useState(0);
  const captchaRef = useRef(null);
  const isLocked = lockRemaining > 0;

  const socials = useMemo(() => ({ ...defaultSocials, ...(settings?.socials || {}) }), [settings]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("section_contact_settings")
        .select("*")
        .eq("is_published", true)
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("ContactSection load error:", error);
        setSettings(null);
        setLoading(false);
        return;
      }

      setSettings(data || null);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !settings) return;
    drawCaptcha(captchaRef.current, captcha);
  }, [captcha, loading, settings]);

  const refreshCaptcha = () => {
    setCaptcha(createCaptcha());
    setCaptchaAnswer("");
  };

  useEffect(() => {
    if (!lockUntil) {
      setLockRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockRemaining(remaining);

      if (remaining === 0) {
        setLockUntil(0);
        setCaptchaAttempts(0);
        setCaptcha(createCaptcha());
        setCaptchaAnswer("");
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  useEffect(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const updateTime = () => {
      const now = new Date();
      setPhTime(`${dateFormatter.format(now)} • ${timeFormatter.format(now)}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const now = Date.now();
      if (lockUntil && now < lockUntil) {
        const remaining = Math.max(1, Math.ceil((lockUntil - now) / 1000));
        throw new Error(`Too many incorrect attempts. Please wait ${remaining}s.`);
      }

      if (lockUntil && now >= lockUntil) {
        setLockUntil(0);
        setCaptchaAttempts(0);
      }

      if (!form.name.trim()) throw new Error("Name is required.");
      if (!form.email.trim()) throw new Error("Email is required.");
      if (!form.message.trim()) throw new Error("Message is required.");
      const mathAnswer = Number(captchaAnswer.trim());
      if (!Number.isFinite(mathAnswer)) throw new Error("Math answer is required.");
      if (mathAnswer !== captcha.answer) {
        const nextAttempts = captchaAttempts + 1;
        setCaptchaAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          const lockMs = 60 * 1000;
          setLockUntil(Date.now() + lockMs);
          setLockRemaining(Math.ceil(lockMs / 1000));
          setCaptcha(createCaptcha());
          setCaptchaAnswer("");
          throw new Error("Too many incorrect attempts. Please wait 60s.");
        }

        refreshCaptcha();
        throw new Error("Incorrect math answer. Please try again.");
      }

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || null,
        message: form.message.trim(),
        page_url: typeof window !== "undefined" ? window.location.href : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      const { error: insErr } = await supabase.from("contact_messages").insert([payload]);
      if (insErr) throw insErr;

      setForm({ name: "", email: "", subject: "", message: "" });
      refreshCaptcha();
      setCaptchaAttempts(0);
      setLockUntil(0);
      setLockRemaining(0);
      setNotice("Message sent! I’ll get back to you soon.");
      setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err?.message || "Submit failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SectionBackground sectionKey="contact" id="contact" className="py-5">
        <div className="container text-muted">Loading...</div>
      </SectionBackground>
    );
  }

  if (!settings) {
    return (
      <SectionBackground sectionKey="contact" id="contact" className="py-5">
        <div className="container">
          <h2 className="h3 mb-1">Contact</h2>
          <p className="text-muted mb-0">Contact details will be available soon.</p>
        </div>
      </SectionBackground>
    );
  }

  return (
    <SectionBackground sectionKey="contact" id="contact" className="py-5">
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
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Email *</label>
                    <input
                      className="form-control"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Subject</label>
                    <input
                      className="form-control"
                      value={form.subject}
                      onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Message *</label>
                    <textarea
                      className="form-control"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Captcha *</label>
                    <div className="d-flex align-items-center gap-2">
                      <canvas
                        ref={captchaRef}
                        width={220}
                        height={64}
                        className="border rounded bg-white"
                        aria-label="Math problem captcha"
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ userSelect: "none", WebkitUserDrag: "none" }}
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={refreshCaptcha}
                        disabled={busy || isLocked}
                        title="New problem"
                      >
                        <i className="fa-solid fa-rotate"></i>
                      </button>
                    </div>
                    <div className="form-text">Solve the math problem shown in the image.</div>
                    {isLocked ? (
                      <div className="form-text text-danger">Too many attempts. Try again in {lockRemaining}s.</div>
                    ) : null}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Your Answer *</label>
                    <input
                      className="form-control"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      disabled={busy || isLocked}
                    />
                  </div>

                  <div className="col-12 d-flex justify-content-end">
                    <button className="btn btn-primary" type="submit" disabled={busy || isLocked}>
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

                {settings.hours_text || settings.timezone ? (
                  <div className="mb-3 text-muted small">
                    <i className="fa-regular fa-clock me-2"></i>
                    {[settings.hours_text, settings.timezone].filter(Boolean).join(" • ")}
                  </div>
                ) : null}

                <div className="mb-3 text-muted small">
                  <i className="fa-regular fa-clock me-2"></i>
                  Philippines Time (PHT): {phTime || "Loading..."}
                </div>

                {settings.booking_url ? (
                  <a
                    className="btn btn-outline-dark w-100 mb-3"
                    href={settings.booking_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-solid fa-calendar-check me-2"></i>Book a Call
                  </a>
                ) : null}

                <div className="fw-semibold mb-2">Socials</div>
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(socials).map(([key, url]) => {
                    if (!url) return null;

                    const icon = key === "x" ? "x-twitter" : key;

                    return (
                      <a
                        key={key}
                        className="btn btn-outline-secondary btn-sm"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className={`fa-brands fa-${icon} me-2`}></i>
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
    </SectionBackground>
  );
}
