import HomeSection from './HomeSection';
import HomeHeader from './HomeHeader';
import HomeCTAButton from './HomeCTAButton';

export default function CoreServicesSnapshot({ settings, items = [] }) {
  if (!settings?.is_enabled) return null;

  return (
    <HomeSection>
      <HomeHeader title={settings.title} subtitle={settings.subtitle} />

      <div className="row g-3">
        {items.map((item) => (
          <div className="col-md-4" key={item.id}>
            <div className="card bg-dark text-light border-0 h-100">
              <div className="card-body">
                <div className="mb-2">
                  <i className={`${item.icon_class} me-2`} />
                  <span className="fw-semibold">{item.title}</span>
                </div>
                <p className="opacity-75 mb-0">{item.description}</p>
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
