import ExperienceSection from './ExperienceSection';
import TimelineItem from './TimelineItem';

export default function Timeline({ items = [] }) {
  if (!items?.length) {
    return (
      <ExperienceSection>
        <div className="text-center opacity-75">No experience items yet.</div>
      </ExperienceSection>
    );
  }

  return (
    <ExperienceSection>
      <div className="d-flex flex-column gap-3">
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
    </ExperienceSection>
  );
}
