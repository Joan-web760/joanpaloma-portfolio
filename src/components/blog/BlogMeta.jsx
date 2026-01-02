import BlogBadge from './BlogBadge';

const formatDate = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(
      new Date(iso)
    );
  } catch {
    return '';
  }
};

export default function BlogMeta({ post }) {
  const tags = Array.isArray(post.tags) ? post.tags : [];

  return (
    <div className="d-flex flex-wrap gap-2 align-items-center">
      {post.category?.name ? <BlogBadge>{post.category.name}</BlogBadge> : null}
      {post.published_at ? <span className="small opacity-75">{formatDate(post.published_at)}</span> : null}
      {tags.slice(0, 3).map((t, idx) => (
        <BlogBadge key={`${post.id}-tag-${idx}`}>{t}</BlogBadge>
      ))}
    </div>
  );
}
