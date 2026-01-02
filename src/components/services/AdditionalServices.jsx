import ServicesSection from './ServicesSection';
import ServicesCard from './ServicesCard';

export default function AdditionalServices({ items = [] }) {
  if (!items?.length) return null;

  return (
    <ServicesSection>
      <div className="row g-3">
        {items.map((s) => (
          <div className="col-md-6 col-lg-4" key={s.id}>
            <ServicesCard
              title={s.title}
              description={s.description}
              bullets={s.bullets}
              iconClass={s.icon_class}
            />
          </div>
        ))}
      </div>
    </ServicesSection>
  );
}
