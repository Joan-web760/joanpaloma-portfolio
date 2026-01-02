'use client';

import { useMemo } from 'react';
import TestimonialsCard from './TestimonialsCard';
import { getPublicImageUrl, normalizeImageSrc } from '@/lib/image';

export default function TestimonialCard({ item }) {
  const avatarSrc = useMemo(() => {
    if (item.avatar_url) return normalizeImageSrc(item.avatar_url);
    if (item.avatar_bucket && item.avatar_path) {
      return getPublicImageUrl(item.avatar_bucket, item.avatar_path);
    }
    return null;
  }, [item.avatar_url, item.avatar_bucket, item.avatar_path]);

  const meta = [item.role, item.company].filter(Boolean).join(' • ');

  return (
    <TestimonialsCard>
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-center gap-3 mb-3">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={item.name}
              width="48"
              height="48"
              className="rounded-circle"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div
              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
              style={{ width: 48, height: 48 }}
              aria-hidden="true"
            >
              <i className="fa-solid fa-user" />
            </div>
          )}

          <div>
            <div className="fw-semibold">{item.name}</div>
            {meta ? <div className="small opacity-75">{meta}</div> : null}
          </div>
        </div>

        {item.rating ? (
          <div className="mb-2" aria-label={`Rating: ${item.rating} out of 5`}>
            {Array.from({ length: item.rating }).map((_, i) => (
              <i key={`${item.id}-star-${i}`} className="fa-solid fa-star me-1" />
            ))}
          </div>
        ) : null}

        <p className="opacity-75 mb-0">“{item.quote}”</p>
      </div>
    </TestimonialsCard>
  );
}
