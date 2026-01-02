import HomeSection from './HomeSection';
import HomeHeader from './HomeHeader';
import HomeCTAButton from './HomeCTAButton';

export default function TestimonialPreview({ settings, items = [] }) {
  if (!settings?.is_enabled) return null;

  return (
    <HomeSection>
      <HomeHeader title={settings.title} subtitle={settings.subtitle} />

      <div className="row g-3">
        {items.map((t) => (
          <div className="col-md-6" key={t.id}>
            <div className="card bg-dark text-light border-0 h-100">
              <div className="card-body">
                <p className="opacity-75 mb-3">“{t.quote}”</p>
                <div className="fw-semibold">{t.name}</div>
                {t.role ? <div className="small opacity-75">{t.role}</div> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-4">
        <HomeCTAButton href={settings.cta_href} label={settings.cta_label} variant="outline-light" />
      </div>
    </HomeSection>
  );
}
