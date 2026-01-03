'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const FALLBACK_GRADIENT =
  'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.25), transparent 45%), radial-gradient(900px circle at 80% 30%, rgba(168,85,247,.20), transparent 40%), linear-gradient(180deg, #0b1220, #070b14)';

const sanitizeCssValue = (v) => (v || '').trim().replace(/;+\s*$/, '');
const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

export default function BackgroundWrapper({ children }) {
  const pathname = usePathname();
  const [bg, setBg] = useState(null);
  const [bgVer, setBgVer] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_background_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('Background settings load error:', error.message);
      setBg(null);
      return;
    }

    setBg(data || null);
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onUpdate = () => {
      setBgVer((v) => v + 1);
      load();
    };

    window.addEventListener('site-background-updated', onUpdate);
    return () => window.removeEventListener('site-background-updated', onUpdate);
  }, [load]);

  const bgStyle = useMemo(() => {
    const base = {
      minHeight: '100vh',
      backgroundColor: '#0b1220',
      backgroundImage: FALLBACK_GRADIENT,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'scroll',
    };

    if (!bg) return base;

    const type = bg.background_type || 'gradient';

    if (type === 'color') {
      const c = sanitizeCssValue(bg.background_color) || '#0b1220';
      return { ...base, backgroundColor: c, backgroundImage: 'none', backgroundAttachment: 'scroll' };
    }

    if (type === 'gradient') {
      const css = sanitizeCssValue(bg.gradient_css) || FALLBACK_GRADIENT;
      return { ...base, backgroundColor: '#0b1220', backgroundImage: css, backgroundAttachment: 'scroll' };
    }

    if (type === 'image') {
      if (!bg.image_path) return base;

      const { data } = supabase.storage.from('site').getPublicUrl(bg.image_path);
      const url = data?.publicUrl ? `${data.publicUrl}?v=${bgVer}` : null;
      if (!url) return base;

      const repeat = pick(bg.image_repeat, ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'], 'no-repeat');
      const size = pick(bg.image_size, ['cover', 'contain', 'auto'], 'cover');

      const positionRaw = (bg.image_position || '').trim();
      const positionAllowed = [
        'center',
        'top',
        'bottom',
        'left',
        'right',
        'top left',
        'top right',
        'bottom left',
        'bottom right',
        'left top',
        'right top',
        'left bottom',
        'right bottom',
      ];
      const position = positionAllowed.includes(positionRaw) ? positionRaw : 'center';

      const attachment = pick(bg.image_attachment, ['scroll', 'fixed', 'local'], 'scroll');

      return {
        ...base,
        backgroundColor: '#0b1220',
        backgroundImage: `url(${url})`,
        backgroundRepeat: repeat,
        backgroundSize: size,
        backgroundPosition: position,
        backgroundAttachment: attachment,
      };
    }

    return base;
  }, [bg, bgVer]);

  const overlayStyle = useMemo(() => {
    if (!bg?.overlay_enabled) return null;

    const overlayColor = sanitizeCssValue(bg.overlay_color) || 'rgba(0,0,0,0.55)';
    const blurPx = Number(bg.overlay_blur_px || 0);

    return {
      position: 'absolute',
      inset: 0,
      backgroundColor: overlayColor,
      backdropFilter: blurPx ? `blur(${blurPx}px)` : undefined,
      pointerEvents: 'none', // IMPORTANT: never block clicks
      zIndex: 0, // behind content
    };
  }, [bg]);

  return (
    <div
      className="min-vh-100"
      style={{
        ...bgStyle,
        position: 'relative',
        isolation: 'isolate', // IMPORTANT: makes z-index predictable
      }}
    >
      {/* Overlay layer */}
      {overlayStyle ? <div style={overlayStyle} /> : null}

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
