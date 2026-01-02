export default function PricingSection({ children, className = '' }) {
  return <section className={`py-5 ${className}`.trim()}>{children}</section>;
}
