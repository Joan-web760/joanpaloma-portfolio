import PricingCardUI from './PricingCardUI';
import PricingCTAButton from './PricingCTAButton';

export default function PricingCard({ plan }) {
  const features = Array.isArray(plan.features) ? plan.features : [];

  return (
    <PricingCardUI highlighted={!!plan.is_popular}>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div>
            <h2 className="h5 mb-1">{plan.name}</h2>
            {plan.description ? <div className="small opacity-75">{plan.description}</div> : null}
          </div>

          {plan.is_popular ? <span className="badge text-bg-warning">Popular</span> : null}
        </div>

        <div className="my-3">
          <div className="display-6 fw-bold">{plan.price_label}</div>
          <div className="small opacity-75">
            {[plan.billing_note, plan.delivery_estimate].filter(Boolean).join(' • ')}
          </div>
        </div>

        {features.length ? (
          <ul className="opacity-75">
            {features.map((f, idx) => (
              <li key={`${plan.id}-f-${idx}`}>{f}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto pt-3">
          <PricingCTAButton
            href={plan.cta_href}
            label={plan.cta_label}
            variant={plan.is_popular ? 'dark' : 'primary'}
            className="w-100"
          />
        </div>
      </div>
    </PricingCardUI>
  );
}
