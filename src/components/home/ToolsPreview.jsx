import HomeSection from './HomeSection';
import HomeHeader from './HomeHeader';
import HomeCTAButton from './HomeCTAButton';

export default function ToolsPreview({ settings, items = [] }) {
  if (!settings?.is_enabled) return null;

  return (
    <HomeSection>
      <HomeHeader title={settings.title} subtitle={settings.subtitle} />

      <div className="row g-3">
        {items.map((t) => (
          <div className="col-sm-6 col-md-3" key={t.id}>
            <div className="card bg-dark text-light border-0 h-100">
              <div className="card-body d-flex align-items-center gap-2">
                <i className={t.icon_class} />
                <span className="fw-semibold">{t.label}</span>
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
