import ServicesSection from './ServicesSection';
import ServicesCTAButton from './ServicesCTAButton';

export default function PrimaryService({ data }) {
  if (!data?.is_enabled) return null;

  const bullets = Array.isArray(data.bullets) ? data.bullets : [];

  return (
    <ServicesSection>
      <div className="row align-items-center g-4">
        <div className="col-lg-7">
          <div className="d-flex align-items-center gap-2 mb-2">
            <i className={data.icon_class} />
            <h2 className="h3 mb-0">{data.title}</h2>
          </div>

          <p className="opacity-75">{data.description}</p>

          {bullets.length ? (
            <ul className="opacity-75">
              {bullets.map((b, idx) => (
                <li key={`${data.title}-${idx}`}>{b}</li>
              ))}
            </ul>
          ) : null}

          <div className="d-flex flex-wrap gap-2 mt-3">
            <ServicesCTAButton href={data.primary_cta_href} label={data.primary_cta_label} />
            <ServicesCTAButton
              href={data.secondary_cta_href}
              label={data.secondary_cta_label}
              variant="outline-light"
            />
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card bg-dark text-light border-0">
            <div className="card-body">
              {data.image_path ? (
                <img src={data.image_path} alt={data.title} className="img-fluid rounded" loading="lazy" />
              ) : (
                <div className="p-5 text-center opacity-75">
                  <i className="fa-solid fa-image me-2" />
                  Primary service image placeholder
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ServicesSection>
  );
}
