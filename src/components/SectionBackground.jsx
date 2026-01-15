"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const cache = new Map(); // section_key -> row
const BUCKET = "portfolio-backgrounds";

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
    if (!enabled || !row?.bg_image_path) return null;

    const url = supabase.storage.from(BUCKET).getPublicUrl(row.bg_image_path).data.publicUrl;

    return {
      backgroundImage: `url("${url}")`,
      backgroundPosition: row.position || "center center",
      backgroundSize: row.size || "cover",
      backgroundRepeat: row.repeat || "no-repeat",
      backgroundAttachment: row.attachment || "scroll",
    };
  }, [enabled, row]);

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
      style={{ ...(bgStyle || {}), ...(styleProp || {}) }}
    >
      {enabled ? <div style={overlayStyle || undefined} /> : null}
      <div style={{ position: "relative" }}>{children}</div>
    </section>
  );
}
