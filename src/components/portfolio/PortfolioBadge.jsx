export default function PortfolioBadge({ children }) {
  if (!children) return null;
  return <span className="badge text-bg-secondary">{children}</span>;
}
