import FAQCard from './FAQCard';

export default function FAQItem({ item, index }) {
  const headingId = `faqHeading-${item.id}`;
  const collapseId = `faqCollapse-${item.id}`;
  const isFirst = index === 0;

  return (
    <FAQCard>
      <div className="accordion-item bg-dark text-light border-0">
        <h2 className="accordion-header" id={headingId}>
          <button
            className={`accordion-button ${isFirst ? '' : 'collapsed'} bg-dark text-light`}
            type="button"
            data-bs-toggle="collapse"
            data-bs-target={`#${collapseId}`}
            aria-expanded={isFirst ? 'true' : 'false'}
            aria-controls={collapseId}
          >
            {item.question}
          </button>
        </h2>

        <div
          id={collapseId}
          className={`accordion-collapse collapse ${isFirst ? 'show' : ''}`}
          aria-labelledby={headingId}
          data-bs-parent="#faqAccordion"
        >
          <div className="accordion-body opacity-75">{item.answer}</div>
        </div>
      </div>
    </FAQCard>
  );
}
