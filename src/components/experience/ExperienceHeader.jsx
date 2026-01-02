import ExperienceSection from './ExperienceSection';

export default function ExperienceHeader({ title, subtitle }) {
  return (
    <ExperienceSection className="pt-4">
      <div className="text-center">
        <h1 className="display-6 fw-bold">{title || 'Experience'}</h1>
        {subtitle ? <p className="lead opacity-75 mb-0">{subtitle}</p> : null}
      </div>
    </ExperienceSection>
  );
}
