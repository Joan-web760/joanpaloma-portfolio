export default function BlogSection({ children, className = '' }) {
  return <section className={`py-5 ${className}`.trim()}>{children}</section>;
}
