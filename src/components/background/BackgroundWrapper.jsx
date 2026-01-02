'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const OLD_FALLBACK_GRADIENT = 'linear-gradient(180deg, #0b1220, #070b14)';

export default function BackgroundWrapper({ children }) {
  const [bg, setBg] = useState(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data } = await supabase
        .from('background_settings')
        .select('*')
        .eq('id', true)
        .single();

      if (alive) setBg(data || null);
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  /**
   * Always keep a real background to avoid "white flash"
   */
  const baseStyle = {
    minHeight: '100vh',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const fallbackStyle = {
    ...baseStyle,
    background: OLD_FALLBACK_GRADIENT,
  };

  // If settings not loaded yet OR disabled OR none -> use old gradient
  if (!bg || !bg.is_enabled || bg.mode === 'none') {
    return (
      <div style={fallbackStyle} className="min-vh-100">
        {children}
      </div>
    );
  }

  const style = { ...baseStyle };

  // Gradient mode (DB-driven). If missing values, fallback to old gradient.
  if (bg.mode === 'gradient') {
    const angle = bg.gradient_angle ?? 180;
    const from = bg.gradient_from || null;
    const to = bg.gradient_to || null;

    style.background =
      from && to ? `linear-gradient(${angle}deg, ${from}, ${to})` : OLD_FALLBACK_GRADIENT;
  }

  // Image mode (DB-driven)
  if (bg.mode === 'image') {
    const imageUrl =
      bg.image_url ||
      (bg.image_bucket && bg.image_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bg.image_bucket}/${bg.image_path}`
        : null);

    if (imageUrl) style.backgroundImage = `url(${imageUrl})`;
    else style.background = OLD_FALLBACK_GRADIENT;
  }

  // Pattern mode (if you want to implement later, fallback gracefully for now)
  if (bg.mode === 'pattern') {
    style.background = OLD_FALLBACK_GRADIENT;
  }

  // Optional overlay (useful for images; safe default)
  const showOverlay = bg.mode === 'image';
  const overlayStyle = showOverlay
    ? {
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: bg.image_blur_px ? `blur(${bg.image_blur_px}px)` : undefined,
        minHeight: '100vh',
      }
    : null;

  return (
    <div style={style} className="min-vh-100">
      {overlayStyle ? <div style={overlayStyle}>{children}</div> : children}
    </div>
  );
}
