"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminSection from "@/components/admin/AdminSection";
import AdminVisibilityToggle from "@/components/admin/AdminVisibilityToggle";

const sectionKeys = [
  "home",
  "about",
  "services",
  "skills",
  "tools",
  "experience",
  "portfolio",
  "certifications",
  "blog",
  "testimonials",
  "pricing",
  "contact",
];

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
};

const normalizeHex = (v) => {
  const s = String(v || "").trim();
  if (!s) return "#000000";
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (/^#([0-9a-fA-F]{3})$/.test(withHash) || /^#([0-9a-fA-F]{6})$/.test(withHash)) return withHash;
  return "#000000";
};

const toRgba = (hex, opacity) => {
  const h = normalizeHex(hex).replace("#", "");
  const o = clamp01(opacity);

  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${o})`;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [site, setSite] = useState(null);
  const [bgs, setBgs] = useState([]);

  const [bgUi, setBgUi] = useState({}); // { [bgId]: { overlay_opacity, overlay_color } }

  const [dirtySite, setDirtySite] = useState(false);
  const [dirtyBg, setDirtyBg] = useState({}); // { [bgId]: true }

  const [siteUi, setSiteUi] = useState({
    site_title: "",
    site_description: "",
    site_keywords: "",
    footer_text: "",
    footer_tagline: "",
    is_published: true,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/settings");
        return;
      }

      const { data: s, error: sErr } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();

      const { data: bg, error: bgErr } = await supabase
        .from("section_backgrounds")
        .select("*")
        .order("section_key", { ascending: true });

      if (!alive) return;

      if (sErr || bgErr) {
        setError((sErr?.message || bgErr?.message) || "Failed to load settings.");
        setLoading(false);
        return;
      }

      setSite(s || null);
      setBgs(bg || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!site) return;
    setSiteUi({
      site_title: site.site_title || "My Portfolio",
      site_description: site.site_description || "",
      site_keywords: site.site_keywords || "",
      footer_text: site.footer_text || "",
      footer_tagline: site.footer_tagline || "",
      is_published: !!site.is_published,
    });
    setDirtySite(false);
  }, [site]);

  useEffect(() => {
    const next = {};
    const dirtyNext = {};
    for (const row of bgs || []) {
      next[row.id] = {
        overlay_opacity: clamp01(row.overlay_opacity),
        overlay_color: normalizeHex(row.overlay_color || "#000000"),
      };
      dirtyNext[row.id] = false;
    }
    setBgUi(next);
    setDirtyBg(dirtyNext);
  }, [bgs]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  };

  const bgByKey = useMemo(() => {
    const map = {};
    for (const k of sectionKeys) map[k] = null;
    for (const x of bgs) map[x.section_key] = x;
    return map;
  }, [bgs]);

  const anyBgDirty = useMemo(() => Object.values(dirtyBg).some(Boolean), [dirtyBg]);
  const dirty = dirtySite || anyBgDirty;

  const bgUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-backgrounds").getPublicUrl(path).data.publicUrl;
  };

  const markDirtyBg = (id) => setDirtyBg((prev) => ({ ...prev, [id]: true }));

  const saveBg = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("section_backgrounds")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setBgs((prev) => prev.map((x) => (x.id === id ? data : x)));
      setDirtyBg((prev) => ({ ...prev, [id]: false }));
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  // The shell's single Save: site details + every background whose overlay changed.
  const saveAll = async () => {
    if (!site?.id || !dirty) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (dirtySite) {
        const { data, error: updErr } = await supabase
          .from("site_settings")
          .update({
            site_title: siteUi.site_title.trim() || "My Portfolio",
            site_description: siteUi.site_description.trim() || null,
            site_keywords: siteUi.site_keywords.trim() || null,
            footer_text: siteUi.footer_text.trim() || null,
            footer_tagline: siteUi.footer_tagline.trim() || null,
            is_published: !!siteUi.is_published,
          })
          .eq("id", site.id)
          .select("*")
          .single();
        if (updErr) throw updErr;
        setSite(data);
        setDirtySite(false);
      }

      const dirtyIds = Object.keys(dirtyBg).filter((id) => dirtyBg[id]);
      for (const id of dirtyIds) {
        const ui = bgUi[id];
        if (!ui) continue;
        const { data, error: updErr } = await supabase
          .from("section_backgrounds")
          .update({
            overlay_color: normalizeHex(ui.overlay_color),
            overlay_opacity: clamp01(ui.overlay_opacity),
          })
          .eq("id", id)
          .select("*")
          .single();
        if (updErr) throw updErr;
        setBgs((prev) => prev.map((x) => (x.id === id ? data : x)));
        setDirtyBg((prev) => ({ ...prev, [id]: false }));
      }

      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const uploadBg = async (sectionKey, file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
    const filename = `${sectionKey}_${crypto.randomUUID()}.${safeExt}`;
    const path = `sections/${sectionKey}/${filename}`;

    const { error: upErr } = await supabase.storage.from("portfolio-backgrounds").upload(path, file, { upsert: false });

    if (upErr) throw upErr;
    return path;
  };

  const removeBgFile = async (path) => {
    if (!path) return;
    await supabase.storage.from("portfolio-backgrounds").remove([path]);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted py-4">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Loading Site settings…
      </div>
    );
  }

  if (!site) {
    return <AdminPageShell error="No settings row was found. Re-run the seed SQL for site_settings." />;
  }

  return (
    <AdminPageShell
      preview="/"
      previewLabel="View website"
      dirty={dirty}
      saving={busy}
      onSave={saveAll}
      error={error}
      notice={notice}
    >
      <AdminSection
        title="Site details"
        description="Your site name, how it appears in search results, and overall visibility."
      >
        <div className="mb-3">
          <label className="form-label">Site name</label>
          <input
            className="form-control"
            placeholder="Joan Paloma - Virtual Assistant"
            value={siteUi.site_title}
            onChange={(e) => {
              setSiteUi((p) => ({ ...p, site_title: e.target.value }));
              setDirtySite(true);
            }}
            disabled={busy}
          />
          <div className="form-text">Shown in the browser tab and search results.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Search description</label>
          <textarea
            className="form-control"
            rows="2"
            placeholder="Short description of your portfolio and services."
            value={siteUi.site_description}
            onChange={(e) => {
              setSiteUi((p) => ({ ...p, site_description: e.target.value }));
              setDirtySite(true);
            }}
            disabled={busy}
          />
          <div className="form-text">1-2 sentences used for search results and link previews.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Keywords</label>
          <input
            className="form-control"
            placeholder="virtual assistant, operations, admin support"
            value={siteUi.site_keywords}
            onChange={(e) => {
              setSiteUi((p) => ({ ...p, site_keywords: e.target.value }));
              setDirtySite(true);
            }}
            disabled={busy}
          />
          <div className="form-text">Comma-separated words that describe your services.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Footer text</label>
          <input
            className="form-control"
            placeholder="© 2026 Joan Paloma. All rights reserved."
            value={siteUi.footer_text}
            onChange={(e) => {
              setSiteUi((p) => ({ ...p, footer_text: e.target.value }));
              setDirtySite(true);
            }}
            disabled={busy}
          />
          <div className="form-text">Also editable on the Footer page — either place updates the same text.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Footer bottom line</label>
          <input
            className="form-control"
            placeholder="Built for clarity, trust, and momentum."
            value={siteUi.footer_tagline}
            onChange={(e) => {
              setSiteUi((p) => ({ ...p, footer_tagline: e.target.value }));
              setDirtySite(true);
            }}
            disabled={busy}
          />
        </div>

        <div className="mt-4">
          <AdminVisibilityToggle
            checked={!!siteUi.is_published}
            onChange={(v) => {
              setSiteUi((p) => ({ ...p, is_published: v }));
              setDirtySite(true);
            }}
            disabled={busy}
            label="Site is live"
            help="When off, search engines are asked not to index the site."
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Section backgrounds"
        description="An optional background image and colour overlay for each section. Uploads, enable/disable, and the layout options save right away; the overlay colour and opacity save with the Save button."
      >
        <div className="vstack gap-3">
          {sectionKeys.map((key) => {
            const row = bgByKey[key];
            if (!row) return null;

            const preview = row.bg_image_path ? bgUrl(row.bg_image_path) : "";
            const ui = bgUi[row.id] || {
              overlay_opacity: clamp01(row.overlay_opacity),
              overlay_color: normalizeHex(row.overlay_color || "#000000"),
            };
            const overlayCss = toRgba(ui.overlay_color, ui.overlay_opacity);

            return (
              <div key={key} className="border rounded bg-white p-3">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <div className="fw-semibold text-capitalize">{key}</div>

                  <div className="d-flex gap-2 align-items-center">
                    {dirtyBg[row.id] ? <span className="badge text-bg-warning">Unsaved</span> : null}

                    <div className="form-check form-switch ms-1">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        defaultChecked={!!row.is_enabled}
                        onChange={(e) => saveBg(row.id, { is_enabled: e.target.checked })}
                        disabled={busy}
                        id={`en_${row.id}`}
                      />
                      <label className="form-check-label" htmlFor={`en_${row.id}`}>
                        On
                      </label>
                    </div>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={busy || !row.bg_image_path}
                      onClick={async () => {
                        if (!row.bg_image_path) return;
                        const ok = await confirm({
                          title: "Remove background?",
                          message: `Remove the background image for "${key}"?`,
                          confirmText: "Remove",
                          confirmVariant: "danger",
                        });
                        if (!ok) return;

                        setBusy(true);
                        setError("");
                        setNotice("");
                        try {
                          await removeBgFile(row.bg_image_path);
                          await saveBg(row.id, { bg_image_path: null, is_enabled: false });
                          success({ title: "Background removed", message: `Removed the "${key}" background.` });
                        } catch (e) {
                          setError(e.message || "Remove failed.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <i className="fa-solid fa-trash me-2"></i>Remove
                    </button>
                  </div>
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-12 col-md-5">
                    <label className="form-label">Upload / replace image</label>
                    <input
                      className="form-control"
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setBusy(true);
                        setError("");
                        setNotice("");

                        try {
                          const path = await uploadBg(key, file);
                          if (row.bg_image_path) await removeBgFile(row.bg_image_path);
                          await saveBg(row.id, { bg_image_path: path, is_enabled: true });
                        } catch (err) {
                          setError(err.message || "Upload failed.");
                        } finally {
                          setBusy(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <div className="form-text">A wide image (1600px or wider).</div>

                    {preview ? (
                      <div className="rounded border mt-2 overflow-hidden position-relative">
                        <img src={preview} alt={`${key} background`} className="img-fluid d-block" />
                        <div
                          className="position-absolute top-0 start-0 w-100 h-100"
                          style={{ background: overlayCss }}
                          aria-hidden="true"
                        />
                      </div>
                    ) : (
                      <div className="small text-muted mt-2">No image.</div>
                    )}
                  </div>

                  <div className="col-12 col-md-7">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label">Overlay colour</label>
                        <div className="input-group">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={ui.overlay_color}
                            disabled={busy}
                            onChange={(e) => {
                              const val = normalizeHex(e.target.value);
                              setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_color: val } }));
                              markDirtyBg(row.id);
                            }}
                            title="Pick overlay colour"
                          />
                          <input
                            className="form-control"
                            value={ui.overlay_color}
                            disabled={busy}
                            onChange={(e) => {
                              const val = normalizeHex(e.target.value);
                              setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_color: val } }));
                              markDirtyBg(row.id);
                            }}
                          />
                        </div>
                        <div className="form-text">A darker overlay makes text easier to read.</div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label d-flex align-items-center justify-content-between">
                          <span>Overlay strength</span>
                          <span className="small text-muted">{ui.overlay_opacity.toFixed(2)}</span>
                        </label>
                        <input
                          className="form-range"
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={ui.overlay_opacity}
                          disabled={busy}
                          onChange={(e) => {
                            const val = clamp01(e.target.value);
                            setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_opacity: val } }));
                            markDirtyBg(row.id);
                          }}
                        />
                        <div className="form-text">0 is see-through, 1 is solid colour.</div>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Focal point</label>
                        <input
                          className="form-control"
                          placeholder="center center"
                          defaultValue={row.position}
                          onBlur={(e) => saveBg(row.id, { position: e.target.value.trim() || "center center" })}
                          disabled={busy}
                        />
                        <div className="form-text">e.g. center center, top right.</div>
                      </div>

                      <div className="col-6 col-md-3">
                        <label className="form-label">Fit</label>
                        <select
                          className="form-select"
                          defaultValue={row.size}
                          onChange={(e) => saveBg(row.id, { size: e.target.value })}
                          disabled={busy}
                        >
                          {["cover", "contain", "auto"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-6 col-md-3">
                        <label className="form-label">Repeat</label>
                        <select
                          className="form-select"
                          defaultValue={row.repeat}
                          onChange={(e) => saveBg(row.id, { repeat: e.target.value })}
                          disabled={busy}
                        >
                          {["no-repeat", "repeat", "repeat-x", "repeat-y"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">Scroll behaviour</label>
                        <select
                          className="form-select"
                          defaultValue={row.attachment}
                          onChange={(e) => saveBg(row.id, { attachment: e.target.value })}
                          disabled={busy}
                        >
                          {["scroll", "fixed"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <div className="form-text">Choose fixed to keep the image still while the page scrolls.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AdminSection>

      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </AdminPageShell>
  );
}
