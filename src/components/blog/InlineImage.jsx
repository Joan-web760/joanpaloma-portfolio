'use client';

import { useMemo } from 'react';
import { getPublicImageUrl, normalizeImageSrc } from '@/lib/image';

export default function InlineImage({ data }) {
  const src = useMemo(() => {
    if (!data) return null;
    if (data.url) return normalizeImageSrc(data.url);
    if (data.bucket && data.path) return getPublicImageUrl(data.bucket, data.path);
    return null;
  }, [data]);

  if (!src) return null;

  return (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={data.alt || ''} className="img-fluid rounded" loading="lazy" />
      {data.caption ? <figcaption className="small opacity-75 mt-2">{data.caption}</figcaption> : null}
    </figure>
  );
}
