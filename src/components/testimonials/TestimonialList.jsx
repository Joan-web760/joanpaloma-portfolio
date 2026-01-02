import TestimonialCard from './TestimonialCard';

export default function TestimonialList({ items = [] }) {
  if (!items?.length) {
    return <div className="text-center opacity-75">No testimonials yet.</div>;
  }

  return (
    <div className="row g-3">
      {items.map((t) => (
        <div className="col-md-6 col-lg-4" key={t.id}>
          <TestimonialCard item={t} />
        </div>
      ))}
    </div>
  );
}
