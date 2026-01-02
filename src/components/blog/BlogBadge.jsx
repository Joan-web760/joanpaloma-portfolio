export default function BlogBadge({ children }) {
  if (!children) return null;
  return <span className="badge text-bg-secondary">{children}</span>;
}
