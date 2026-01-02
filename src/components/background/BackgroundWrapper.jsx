'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const FALLBACK =
  'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.25), transparent 45%), radial-gradient(900px circle at 80% 30%, rgba(168,85,247,.20), transparent 40%), linear-gradient(180deg, #0b1220, #070b14)';

const sanitizeCssValue = (v) => (v || '').trim().replace(/;+\s*$/, '');

export default function BackgroundWrapper({ children }) {
  const pathname = usePathname();
  const [bg, setBg] = useState(null);

  // used for cache-busting background image URLs
  const [bgVer, setBgVer] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_background_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      setBg(null);
      return;
    }

    setBg(data || null);
  }, []);

  // Load on route change (existing behavior)
  useEffect(() => {
    load();
  }, [load, pathname]);

  // Listen for instant refresh event from admin settings
  useEffect(() => {
    const onUpdate = () => {
      setBgVer((v) => v + 1); // bust image cache
      load();
    };

    window.addEventListener('site-background-updated', onUpdate);
    return () => window.removeEventListener('site-background-updated', onUpdate);
  }, [load]);

  const style = useMemo(() => {
    const base = {
      minHeight: '100vh',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };

    if (!bg) return { ...base, background: FALLBACK };

    const type = bg.background_type || 'gradient';

    // COLOR
    if (type === 'color') {
      const c = sanitizeCssValue(bg.background_color) || '#0b1220';
      return { ...base, background: c, backgroundImage: undefined };
    }

    // GRADIENT
    if (type === 'gradient') {
      const css = sanitizeCssValue(bg.gradient_css);
      return { ...base, background: css || FALLBACK, backgroundImage: undefined };
    }

    // IMAGE
    if (type === 'image') {
      if (!bg.image_path) return { ...base, background: FALLBACK, backgroundImage: undefined };

      // safest way: let supabase client build the public URL
      const { data } = supabase.storage.from('site').getPublicUrl(bg.image_path);
      const url = data?.publicUrl ? `${data.publicUrl}?v=${bgVer}` : null;

      if (!url) return { ...base, background: FALLBACK, backgroundImage: undefined };

      return {
        ...base,
        background: undefined, // remove previous gradient/color
        backgroundImage: `url(${url})`,
      };
    }

    return { ...base, background: FALLBACK };
  }, [bg, bgVer]);

  const overlayStyle = useMemo(() => {
    if (!bg?.overlay_enabled) return null;

    const overlayColor = sanitizeCssValue(bg.overlay_color) || 'rgba(0,0,0,0.55)';
    const blurPx = Number(bg.overlay_blur_px || 0);

    return {
      minHeight: '100vh',
      background: overlayColor,
      backdropFilter: blurPx ? `blur(${blurPx}px)` : undefined,
    };
  }, [bg]);

  return (
    <div style={style} className="min-vh-100">
      {overlayStyle ? <div style={overlayStyle}>{children}</div> : children}
    </div>
  );
}
