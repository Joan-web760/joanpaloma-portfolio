import HomeSection from './HomeSection';
import HomeHeader from './HomeHeader';

export default function WhyWorkWithMe({ settings, points = [] }) {
  if (!settings?.is_enabled) return null;

  return (
    <HomeSection>
      <HomeHeader title={settings.title} subtitle={settings.subtitle} />

      <div className="row g-3">
        {points.map((p) => (
          <div className="col-md-6" key={p.id}>
            <div className="card bg-dark text-light border-0">
              <div className="card-body d-flex gap-3 align-items-start">
                <div className="mt-1">
                  <i className={p.icon_class} />
                </div>
                <div className="opacity-75">{p.text}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
