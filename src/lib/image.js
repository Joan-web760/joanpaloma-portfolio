import { supabase } from './supabaseClient';

export const getPublicImageUrl = (bucket, path) => {
  if (!bucket || !path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
};

// If you store full URLs in DB sometimes:
export const normalizeImageSrc = (src) => {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return src;
};
