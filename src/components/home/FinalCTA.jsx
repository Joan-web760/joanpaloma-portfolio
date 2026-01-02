import HomeSection from './HomeSection';
import HomeCTAButton from './HomeCTAButton';

export default function FinalCTA({ data }) {
  if (!data?.is_enabled) return null;

  return (
    <HomeSection className="pb-5">
      <div className="card bg-dark text-light border-0">
        <div className="card-body text-center py-5">
          <h2 className="h3 mb-2">{data.title}</h2>
          <p className="opacity-75 mb-4">{data.subtitle}</p>
          <HomeCTAButton href={data.cta_href} label={data.cta_label} />
        </div>
      </div>
    </HomeSection>
  );
}
