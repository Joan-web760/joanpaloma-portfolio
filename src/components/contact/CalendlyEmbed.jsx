export default function CalendlyEmbed({ url }) {
  if (!url) return null;

  return (
    <div className="card bg-dark text-light border-0 h-100">
      <div className="card-body p-0">
        <iframe
          src={url}
          style={{ width: '100%', height: '600px', border: 'none' }}
          loading="lazy"
          title="Calendly"
        />
      </div>
    </div>
  );
}
