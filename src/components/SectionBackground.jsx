"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const cache = new Map(); // section_key -> row
const BUCKET = "portfolio-backgrounds";

export default function SectionBackground({ sectionKey, children, className = "", style: styleProp, ...rest }) {
  const [row, setRow] = useState(cache.get(sectionKey) || null);

  const bgStyle = useMemo(() => {
    if (!row?.is_enabled || !row?.bg_image_path) return null;

    const url = supabase.storage.from(BUCKET).getPublicUrl(row.bg_image_path).data.publicUrl;

    return {
      backgroundImage: `url("${url}")`,
      backgroundPosition: row.position || "center center",
      backgroundSize: row.size || "cover",
      backgroundRepeat: row.repeat || "no-repeat",
      backgroundAttachment: row.attachment || "scroll",
    };
  }, [row]);

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

  const enabled = !!(bgStyle && row?.is_enabled);
  const overlayOpacity = enabled ? Number(row?.overlay_opacity ?? 0.55) : 0;

  return (
    <section
      {...rest}
      className={`position-relative ${className}`}
      style={{ ...(bgStyle || {}), ...(styleProp || {}) }}
    >
      {enabled ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${overlayOpacity})`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <div style={{ position: "relative" }}>{children}</div>
    </section>
  );
}
