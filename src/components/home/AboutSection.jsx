import HomeSection from './HomeSection';
import HomeCTAButton from './HomeCTAButton';

export default function AboutSection({ data }) {
  if (!data?.is_enabled) return null;

  return (
    <HomeSection>
      <div className="row align-items-center g-4">
        <div className="col-lg-6">
          <h2 className="h3 mb-3">{data.title}</h2>
          <p className="opacity-75">{data.body}</p>

          <HomeCTAButton href={data.cta_href} label={data.cta_label} />
        </div>

        <div className="col-lg-6">
          <div className="card bg-dark text-light border-0">
            <div className="card-body">
              {data.image_path ? (
                <img src={data.image_path} alt="About" className="img-fluid rounded" loading="lazy" />
              ) : (
                <div className="p-5 text-center opacity-75">
                  <i className="fa-solid fa-user me-2" />
                  About image placeholder
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </HomeSection>
  );
}
