'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import BlogMeta from './BlogMeta';
import { getPublicImageUrl, normalizeImageSrc } from '@/lib/image';

export default function BlogCard({ post }) {
  const coverSrc = useMemo(() => {
    if (post.cover_image_url) return normalizeImageSrc(post.cover_image_url);
    if (post.cover_image_bucket && post.cover_image_path) {
      return getPublicImageUrl(post.cover_image_bucket, post.cover_image_path);
    }
    return null;
  }, [post.cover_image_url, post.cover_image_bucket, post.cover_image_path]);

  return (
    <div className="card bg-dark text-light border-0 h-100">
      {coverSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverSrc}
          alt={post.title}
          className="card-img-top"
          style={{ objectFit: 'cover', height: 180 }}
          loading="lazy"
        />
      ) : (
        <div className="d-flex align-items-center justify-content-center opacity-75" style={{ height: 180 }}>
          <i className="fa-solid fa-image me-2" />
          No cover image
        </div>
      )}

      <div className="card-body d-flex flex-column">
        <BlogMeta post={post} />

        <h2 className="h5 mt-2">{post.title}</h2>
        {post.excerpt ? <p className="opacity-75">{post.excerpt}</p> : null}

        <div className="mt-auto">
          <Link className="btn btn-outline-light btn-sm" href={`/blog/${post.slug}`}>
            Read more
          </Link>
        </div>
      </div>
    </div>
  );
}
