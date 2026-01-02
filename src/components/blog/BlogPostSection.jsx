export default function BlogPostSection({ children, className = '' }) {
  return (
    <section className={`py-5 ${className}`.trim()}>
      <div className="container" style={{ maxWidth: 900 }}>
        {children}
      </div>
    </section>
  );
}
