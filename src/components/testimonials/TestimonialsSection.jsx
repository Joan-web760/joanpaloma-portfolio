export default function TestimonialsSection({ children, className = '' }) {
  return <section className={`py-5 ${className}`.trim()}>{children}</section>;
}
