'use client';

import { useMemo, useState } from 'react';
import ImageGallery from './ImageGallery';
import PortfolioBadge from './PortfolioBadge';
import { getPublicImageUrl, normalizeImageSrc } from '@/lib/image';

const isExternalUrl = (href = '') => /^https?:\/\//i.test(href);

export default function PortfolioCard({ item, images = [] }) {
  const [open, setOpen] = useState(false);

  const tags = Array.isArray(item.tags) ? item.tags : [];

  const coverSrc = useMemo(() => {
    if (item.cover_image_url) return normalizeImageSrc(item.cover_image_url);
    if (item.cover_image_bucket && item.cover_image_path) {
      return getPublicImageUrl(item.cover_image_bucket, item.cover_image_path);
    }
    return null;
  }, [item.cover_image_url, item.cover_image_bucket, item.cover_image_path]);

  const resolvedImages = useMemo(() => {
    return (images || []).map((img) => {
      let src = null;

      if (img.image_url) src = normalizeImageSrc(img.image_url);
      else if (img.image_bucket && img.image_path) src = getPublicImageUrl(img.image_bucket, img.image_path);

      return {
        id: img.id,
        src,
        alt: img.alt || item.title,
      };
    }).filter((x) => x.src);
  }, [images, item.title]);

  const headerBadges = (
    <div className="d-flex flex-wrap gap-2">
      {item.is_featured ? <span className="badge text-bg-warning">Featured</span> : null}
      {tags.slice(0, 4).map((t, idx) => (
        <PortfolioBadge key={`${item.id}-tag-${idx}`}>{t}</PortfolioBadge>
      ))}
    </div>
  );

  return (
    <>
      <div className="card bg-dark text-light border-0 h-100">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={item.title}
            className="card-img-top"
            style={{ objectFit: 'cover', height: 180 }}
            loading="lazy"
          />
        ) : (
          <div
            className="d-flex align-items-center justify-content-center opacity-75"
            style={{ height: 180 }}
          >
            <i className="fa-solid fa-image me-2" />
            No cover image
          </div>
        )}

        <div className="card-body d-flex flex-column">
          <div className="mb-2">{headerBadges}</div>

          <h3 className="h5">{item.title}</h3>
          {item.client ? <div className="small opacity-75 mb-2">{item.client}</div> : null}

          {item.summary ? <p className="opacity-75">{item.summary}</p> : null}

          <div className="mt-auto d-flex flex-wrap gap-2">
            {resolvedImages.length ? (
              <button className="btn btn-outline-light btn-sm" onClick={() => setOpen(true)}>
                View Gallery
              </button>
            ) : null}

            {item.project_url ? (
              <a
                className="btn btn-primary btn-sm"
                href={item.project_url}
                target={isExternalUrl(item.project_url) ? '_blank' : undefined}
                rel={isExternalUrl(item.project_url) ? 'noreferrer' : undefined}
              >
                Live
              </a>
            ) : null}

            {item.repo_url ? (
              <a className="btn btn-outline-secondary btn-sm" href={item.repo_url} target="_blank" rel="noreferrer">
                Repo
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <ImageGallery
        open={open}
        onClose={() => setOpen(false)}
        title={item.title}
        description={item.description}
        images={resolvedImages}
      />
    </>
  );
}
