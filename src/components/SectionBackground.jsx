"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const cache = new Map(); // section_key -> row

export default function SectionBackground({ sectionKey, children, className = "" }) {
  const [row, setRow] = useState(cache.get(sectionKey) || null);

  const style = useMemo(() => {
    if (!row?.is_enabled || !row?.bg_image_path) return null;

    const url = supabase.storage
      .from("portfolio-backgrounds")
      .getPublicUrl(row.bg_image_path).data.publicUrl;

    return {
      position: "relative",
      backgroundImage: `url(${url})`,
      backgroundPosition: row.position || "center center",
      backgroundSize: row.size || "cover",
      backgroundRepeat: row.repeat || "no-repeat",
      backgroundAttachment: row.attachment || "scroll",
    };
  }, [row]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (cache.has(sectionKey)) return;

      const { data } = await supabase
        .from("section_backgrounds")
        .select("*")
        .eq("section_key", sectionKey)
        .eq("is_enabled", true)
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      cache.set(sectionKey, data || null);
      setRow(data || null);
    })();

    return () => { alive = false; };
  }, [sectionKey]);

  const overlayOpacity = row?.is_enabled ? Number(row?.overlay_opacity ?? 0.55) : 0;

  return (
    <div style={style || undefined} className={className}>
      {style ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${overlayOpacity})`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <div style={{ position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
