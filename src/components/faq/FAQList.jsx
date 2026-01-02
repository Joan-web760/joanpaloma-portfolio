import FAQItem from './FAQItem';

export default function FAQList({ items = [] }) {
  if (!items?.length) {
    return <div className="text-center opacity-75">No FAQs yet.</div>;
  }

  return (
    <div className="accordion" id="faqAccordion">
      {items.map((it, idx) => (
        <FAQItem key={it.id} item={it} index={idx} />
      ))}
    </div>
  );
}
