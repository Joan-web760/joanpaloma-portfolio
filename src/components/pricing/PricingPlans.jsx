import PricingCard from './PricingCard';

export default function PricingPlans({ plans = [] }) {
  if (!plans?.length) {
    return <div className="text-center opacity-75">No pricing plans yet.</div>;
  }

  return (
    <div className="row g-3">
      {plans.map((p) => (
        <div className="col-md-6 col-lg-4" key={p.id}>
          <PricingCard plan={p} />
        </div>
      ))}
    </div>
  );
}
