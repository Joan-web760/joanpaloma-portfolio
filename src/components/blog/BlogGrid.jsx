import BlogCard from './BlogCard';

export default function BlogGrid({ posts = [] }) {
  if (!posts?.length) {
    return <div className="text-center opacity-75">No posts yet.</div>;
  }

  return (
    <div className="row g-3">
      {posts.map((p) => (
        <div className="col-md-6 col-lg-4" key={p.id}>
          <BlogCard post={p} />
        </div>
      ))}
    </div>
  );
}
