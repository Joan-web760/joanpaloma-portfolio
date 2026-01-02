export default function PricingCardUI({ children, highlighted }) {
  return (
    <div className={`card border-0 h-100 ${highlighted ? 'bg-primary text-light' : 'bg-dark text-light'}`}>
      {children}
    </div>
  );
}
