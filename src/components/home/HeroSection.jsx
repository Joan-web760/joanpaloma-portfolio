import HomeSection from './HomeSection';
import HomeCTAButton from './HomeCTAButton';

export default function HeroSection({ data }) {
  if (!data?.is_enabled) return null;

  const badges = Array.isArray(data.badges) ? data.badges : [];

  return (
    <HomeSection className="pt-5">
      <div className="row align-items-center g-4">
        <div className="col-lg-7">
          <h1 className="display-5 fw-bold">{data.headline}</h1>
          <p className="lead opacity-75">{data.subheadline}</p>

          {badges.length ? (
            <div className="d-flex flex-wrap gap-2 mb-4">
              {badges.map((b, idx) => (
                <span key={`${b}-${idx}`} className="badge text-bg-secondary">
                  {b}
                </span>
              ))}
            </div>
          ) : null}

          <div className="d-flex flex-wrap gap-2">
            <HomeCTAButton href={data.primary_cta_href} label={data.primary_cta_label} />
            <HomeCTAButton
              href={data.secondary_cta_href}
              label={data.secondary_cta_label}
              variant="outline-light"
            />
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card bg-dark text-light border-0">
            <div className="card-body">
              {data.hero_image_path ? (
                // For now treat as URL; later you can resolve from Supabase Storage
                <img
                  src={data.hero_image_path}
                  alt="Hero"
                  className="img-fluid rounded"
                  loading="lazy"
                />
              ) : (
                <div className="p-5 text-center opacity-75">
                  <i className="fa-solid fa-image me-2" />
                  Hero image placeholder
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
