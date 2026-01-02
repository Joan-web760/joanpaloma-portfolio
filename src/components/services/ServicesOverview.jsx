import ServicesSection from './ServicesSection';
import ServicesCTAButton from './ServicesCTAButton';

export default function ServicesOverview({ settings }) {
  if (!settings?.is_enabled) return null;

  return (
    <ServicesSection className="pt-4">
      <div className="text-center">
        <h1 className="display-6 fw-bold">{settings.title}</h1>
        <p className="lead opacity-75">{settings.subtitle}</p>

        <div className="mt-3">
          <ServicesCTAButton href={settings.cta_href} label={settings.cta_label} />
        </div>
      </div>
    </ServicesSection>
  );
}
