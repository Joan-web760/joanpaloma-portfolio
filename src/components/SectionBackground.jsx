"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const cache = new Map(); // section_key -> row
const BUCKET = "portfolio-backgrounds";
const FALLBACK_BACKGROUNDS = {
  home: {
    backgroundColor: "#f8f4ec",
    backgroundImage:
      "radial-gradient(circle at 18% 20%, rgba(214, 185, 128, 0.28), transparent 34%), radial-gradient(circle at 84% 16%, rgba(99, 102, 241, 0.16), transparent 28%), linear-gradient(180deg, #fdfbf6 0%, #f6efe2 100%)",
  },
  about: {
    backgroundColor: "#f3f8f6",
    backgroundImage:
      "radial-gradient(circle at 12% 24%, rgba(45, 212, 191, 0.18), transparent 30%), radial-gradient(circle at 82% 22%, rgba(96, 165, 250, 0.16), transparent 24%), linear-gradient(180deg, #fbfffd 0%, #eef7f2 100%)",
  },
  services: {
    backgroundColor: "#f8f8fc",
    backgroundImage:
      "radial-gradient(circle at 16% 18%, rgba(129, 140, 248, 0.16), transparent 28%), radial-gradient(circle at 78% 26%, rgba(251, 191, 36, 0.14), transparent 26%), linear-gradient(180deg, #fcfcff 0%, #f2f3fb 100%)",
  },
  skills: {
    backgroundColor: "#f5f8ff",
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.16), transparent 28%), radial-gradient(circle at 84% 18%, rgba(168, 85, 247, 0.14), transparent 22%), linear-gradient(180deg, #fcfdff 0%, #eef4ff 100%)",
  },
  tools: {
    backgroundColor: "#f4fbfb",
    backgroundImage:
      "radial-gradient(circle at 14% 18%, rgba(20, 184, 166, 0.16), transparent 26%), radial-gradient(circle at 84% 14%, rgba(14, 165, 233, 0.16), transparent 24%), linear-gradient(180deg, #fbffff 0%, #ecf8f8 100%)",
  },
  experience: {
    backgroundColor: "#f8f5f1",
    backgroundImage:
      "radial-gradient(circle at 18% 18%, rgba(217, 119, 6, 0.12), transparent 26%), radial-gradient(circle at 80% 18%, rgba(15, 118, 110, 0.14), transparent 24%), linear-gradient(180deg, #fffdf9 0%, #f4ede4 100%)",
  },
  portfolio: {
    backgroundColor: "#f6f7fb",
    backgroundImage:
      "radial-gradient(circle at 16% 20%, rgba(99, 102, 241, 0.16), transparent 30%), radial-gradient(circle at 82% 18%, rgba(244, 114, 182, 0.14), transparent 24%), linear-gradient(180deg, #fdfdff 0%, #eef1f9 100%)",
  },
  certifications: {
    backgroundColor: "#f8f7f2",
    backgroundImage:
      "radial-gradient(circle at 18% 20%, rgba(245, 158, 11, 0.16), transparent 28%), radial-gradient(circle at 82% 18%, rgba(59, 130, 246, 0.14), transparent 24%), linear-gradient(180deg, #fffef9 0%, #f3efe2 100%)",
  },
  resume: {
    backgroundColor: "#f6f9f8",
    backgroundImage:
      "radial-gradient(circle at 14% 18%, rgba(34, 197, 94, 0.14), transparent 28%), radial-gradient(circle at 84% 16%, rgba(71, 85, 105, 0.12), transparent 22%), linear-gradient(180deg, #fdfffe 0%, #eef5f2 100%)",
  },
  blog: {
    backgroundColor: "#f9f6f3",
    backgroundImage:
      "radial-gradient(circle at 20% 22%, rgba(251, 146, 60, 0.14), transparent 26%), radial-gradient(circle at 82% 20%, rgba(236, 72, 153, 0.12), transparent 22%), linear-gradient(180deg, #fffdfa 0%, #f6eee8 100%)",
  },
  testimonials: {
    backgroundColor: "#f5faf8",
    backgroundImage:
      "radial-gradient(circle at 18% 16%, rgba(16, 185, 129, 0.14), transparent 28%), radial-gradient(circle at 84% 20%, rgba(59, 130, 246, 0.12), transparent 22%), linear-gradient(180deg, #fcfffd 0%, #edf7f2 100%)",
  },
  pricing: {
    backgroundColor: "#f8f7fc",
    backgroundImage:
      "radial-gradient(circle at 16% 20%, rgba(167, 139, 250, 0.14), transparent 28%), radial-gradient(circle at 82% 18%, rgba(251, 191, 36, 0.14), transparent 24%), linear-gradient(180deg, #fdfcff 0%, #f1eef9 100%)",
  },
  contact: {
    backgroundColor: "#f3f8fb",
    backgroundImage:
      "radial-gradient(circle at 16% 22%, rgba(14, 165, 233, 0.14), transparent 28%), radial-gradient(circle at 80% 18%, rgba(59, 130, 246, 0.12), transparent 22%), linear-gradient(180deg, #fbfeff 0%, #edf5f8 100%)",
  },
};

/** helpers */
const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.55;
  return Math.max(0, Math.min(1, n));
};

const normalizeHex = (v) => {
  const s = String(v || "").trim();
  if (!s) return "#000000";
  const withHash = s.startsWith("#") ? s : `#${s}`;
  // accept #RGB or #RRGGBB
  if (/^#([0-9a-fA-F]{3})$/.test(withHash) || /^#([0-9a-fA-F]{6})$/.test(withHash)) return withHash;
  return "#000000";
};

const hexToRgb = (hex) => {
  const h = normalizeHex(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

export default function SectionBackground({ sectionKey, children, className = "", style: styleProp, ...rest }) {
  const [row, setRow] = useState(cache.get(sectionKey) || null);

  const enabled = !!row?.is_enabled;

  const bgStyle = useMemo(() => {
    if (!enabled || !row?.bg_image_path) return FALLBACK_BACKGROUNDS[sectionKey] || FALLBACK_BACKGROUNDS.home;

    const url = supabase.storage.from(BUCKET).getPublicUrl(row.bg_image_path).data.publicUrl;

    return {
      backgroundImage: `url("${url}")`,
      backgroundPosition: row.position || "center center",
      backgroundSize: row.size || "cover",
      backgroundRepeat: row.repeat || "no-repeat",
      backgroundAttachment: row.attachment || "scroll",
    };
  }, [enabled, row, sectionKey]);

  const overlayStyle = useMemo(() => {
    if (!enabled) return null;

    const opacity = clamp01(row?.overlay_opacity ?? 0.55);
    const color = normalizeHex(row?.overlay_color || "#000000");
    const { r, g, b } = hexToRgb(color);

    return {
      position: "absolute",
      inset: 0,
      background: `rgba(${r},${g},${b},${opacity})`,
      pointerEvents: "none",
    };
  }, [enabled, row]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // IMPORTANT: don't early-return if cached value is null (so enabling later works after refresh)
      if (cache.has(sectionKey) && cache.get(sectionKey)) return;

      const { data, error } = await supabase
        .from("section_backgrounds")
        .select("*")
        .eq("section_key", sectionKey)
        .maybeSingle();

      if (!alive) return;

      if (error) console.error("SectionBackground load error:", error);

      cache.set(sectionKey, data || null);
      setRow(data || null);
    })();

    return () => {
      alive = false;
    };
  }, [sectionKey]);

  return (
    <section
      {...rest}
      className={`position-relative ${className}`}
      style={{ minHeight: "100dvh", ...(bgStyle || {}), ...(styleProp || {}) }}
    >
      {enabled ? <div style={overlayStyle || undefined} /> : null}
      <div style={{ position: "relative" }}>{children}</div>
    </section>
  );
}
